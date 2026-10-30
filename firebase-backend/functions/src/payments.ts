import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { defineString } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { RECHARGE_PACKS } from './constants';

// PayU test credentials. Keep the salt in backend code only; never return it
// to the mobile client or include it in the React Native bundle.
export const PAYU_MERCHANT_KEY = 'l6GPzg';
export const PAYU_MERCHANT_SALT = 'OQeSTO9g6bCBnWZcSkKI0iOWOB43dqqF';
const PAYU_ENVIRONMENT = defineString('PAYU_ENVIRONMENT', {
  default: 'test',
  description: 'PayU environment: test or production',
});

const DATA_ROOT = 'speakly';
const PAYMENT_ROOT = `${DATA_ROOT}/payments`;
const RECONCILE_LIMIT = 50;
const CREDIT_LOCK_TIMEOUT_MS = 2 * 60 * 1000;

type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'crediting'
  | 'success'
  | 'failed';

type PaymentRecord = {
  transactionId: string;
  uid: string;
  packId: number;
  amount: number;
  bonus: number;
  creditedAmount: number;
  currency: 'INR';
  status: PaymentStatus;
  createdAt: number;
  updatedAt: number;
  creditingAt?: number;
  creditedAt?: number;
  payuId?: string;
  bankReferenceNumber?: string;
  paymentMode?: string;
  failureReason?: string;
};

const sha512 = (value: string) =>
  createHash('sha512').update(value, 'utf8').digest('hex');

const paymentEnvironment = () =>
  PAYU_ENVIRONMENT.value() === 'production' ? 'production' : 'test';

const postServiceUrl = () =>
  paymentEnvironment() === 'production'
    ? 'https://info.payu.in/merchant/postservice.php?form=2'
    : 'https://test.payu.in/merchant/postservice.php?form=2';

const getBearerToken = (req: Request) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

const getAuthenticatedUid = async (req: Request) => {
  const token = getBearerToken(req);
  if (!token) throw new Error('UNAUTHENTICATED');
  try {
    return (await admin.auth().verifyIdToken(token)).uid;
  } catch {
    throw new Error('UNAUTHENTICATED');
  }
};

const publicPayment = (payment: PaymentRecord) => ({
  id: payment.transactionId,
  transactionId: payment.transactionId,
  amount: payment.amount,
  bonus: payment.bonus,
  creditedAmount: payment.creditedAmount,
  currency: payment.currency,
  status: payment.status,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
  creditedAt: payment.creditedAt || null,
  payuId: payment.payuId || null,
  bankReferenceNumber: payment.bankReferenceNumber || null,
  paymentMode: payment.paymentMode || null,
  failureReason: payment.failureReason || null,
});

const createTransactionId = (uid: string) => {
  const uidTail = uid.replace(/[^a-zA-Z0-9]/g, '').slice(-6);
  const time = Date.now().toString(36);
  const random = randomBytes(5).toString('hex');
  return `SP${time}${uidTail}${random}`.slice(0, 25);
};

const updatePaymentStatus = async (
  payment: PaymentRecord,
  updates: Partial<PaymentRecord>,
) => {
  const now = Date.now();
  const next = { ...updates, updatedAt: now };
  await admin
    .database()
    .ref(DATA_ROOT)
    .update({
      [`payments/${payment.transactionId}`]: { ...payment, ...next },
      [`users/${payment.uid}/paymentHistory/${payment.transactionId}`]: {
        ...publicPayment({ ...payment, ...next }),
      },
      [`pendingPayments/${payment.transactionId}`]:
        next.status === 'failed' || next.status === 'success'
          ? null
          : payment.createdAt,
    });
};

const verifyWithPayU = async (transactionId: string) => {
  const key = PAYU_MERCHANT_KEY;
  const salt = PAYU_MERCHANT_SALT;
  const command = 'verify_payment';
  const body = new URLSearchParams({
    key,
    command,
    var1: transactionId,
    hash: sha512(`${key}|${command}|${transactionId}|${salt}`),
  });
  const response = await fetch(postServiceUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`PayU verification failed with HTTP ${response.status}`);
  }
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('PayU returned an invalid verification response');
  }
  const detail = data?.transaction_details?.[transactionId];
  return { response: data, detail };
};

const creditVerifiedPayment = async (payment: PaymentRecord, detail: any) => {
  const paymentRef = admin
    .database()
    .ref(`${PAYMENT_ROOT}/${payment.transactionId}`);
  const now = Date.now();
  const claim = await paymentRef.transaction(
    (current: PaymentRecord | null) => {
      if (!current || current.status === 'success') return;
      if (
        current.status === 'crediting' &&
        now - Number(current.creditingAt || 0) < CREDIT_LOCK_TIMEOUT_MS
      ) {
        return;
      }
      return {
        ...current,
        status: 'crediting',
        creditingAt: now,
        updatedAt: now,
      };
    },
  );
  if (!claim.committed) return false;

  const claimedPayment = claim.snapshot.val() as PaymentRecord;

  const finalPayment: PaymentRecord = {
    ...claimedPayment,
    status: 'success',
    creditedAt: now,
    updatedAt: now,
    payuId: String(detail?.mihpayid || detail?.mihpayId || ''),
    bankReferenceNumber: String(
      detail?.bank_ref_num || detail?.bankReferenceNumber || '',
    ),
    paymentMode: String(detail?.mode || ''),
    failureReason: '',
  };

  // Keep an idempotency marker in the same transaction as the balance change.
  // Even if a function crashes after this point, a retry can finalize payment
  // history without ever incrementing the wallet a second time.
  await admin
    .database()
    .ref(`${DATA_ROOT}/users/${claimedPayment.uid}/wallet`)
    .transaction((current: any) => {
      const wallet = current && typeof current === 'object' ? current : {};
      const creditedPayments =
        wallet.creditedPayments && typeof wallet.creditedPayments === 'object'
          ? wallet.creditedPayments
          : {};
      if (creditedPayments[claimedPayment.transactionId]) return;
      const currentBalance = Number(wallet.balance);
      return {
        ...wallet,
        balance:
          (Number.isFinite(currentBalance) ? currentBalance : 0) +
          claimedPayment.creditedAmount,
        creditedPayments: {
          ...creditedPayments,
          [claimedPayment.transactionId]: now,
        },
      };
    });

  await admin
    .database()
    .ref(DATA_ROOT)
    .update({
      [`users/${claimedPayment.uid}/paymentHistory/${claimedPayment.transactionId}`]:
        publicPayment(finalPayment),
      [`payments/${claimedPayment.transactionId}`]: finalPayment,
      [`pendingPayments/${claimedPayment.transactionId}`]: null,
    });
  return true;
};

const verifyAndFinalize = async (transactionId: string) => {
  const snapshot = await admin
    .database()
    .ref(`${PAYMENT_ROOT}/${transactionId}`)
    .once('value');
  const payment = snapshot.val() as PaymentRecord | null;
  if (!payment) throw new Error('Payment transaction was not found');
  if (payment.status === 'success') return payment;

  const { detail } = await verifyWithPayU(transactionId);
  if (!detail) {
    await updatePaymentStatus(payment, { status: 'pending' });
    return { ...payment, status: 'pending' as const };
  }
  const verifiedAmount = Number(detail.amt ?? detail.amount);
  if (!Number.isFinite(verifiedAmount) || verifiedAmount !== payment.amount) {
    logger.error('PayU amount mismatch', {
      transactionId,
      expected: payment.amount,
      received: verifiedAmount,
    });
    await updatePaymentStatus(payment, {
      status: 'failed',
      failureReason: 'Payment amount could not be verified',
    });
    return { ...payment, status: 'failed' as const };
  }
  const payuStatus = String(detail.status || '').toLowerCase();
  const unmapped = String(detail.unmappedstatus || '').toLowerCase();
  if (payuStatus === 'success' && ['captured', 'success'].includes(unmapped)) {
    await creditVerifiedPayment(payment, detail);
  } else if (['failure', 'failed', 'bounced', 'dropped'].includes(payuStatus)) {
    await updatePaymentStatus(payment, {
      status: 'failed',
      failureReason: String(
        detail.error_Message || detail.field9 || 'Payment failed',
      ),
    });
  } else {
    await updatePaymentStatus(payment, { status: 'pending' });
  }
  const finalSnapshot = await admin
    .database()
    .ref(`${PAYMENT_ROOT}/${transactionId}`)
    .once('value');
  return finalSnapshot.val() as PaymentRecord;
};

export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const packId = Number(req.body?.packId);
    const pack = RECHARGE_PACKS.find(item => item.id === packId);
    if (!pack) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid recharge pack' });
    }
    const [userSnapshot, authUser] = await Promise.all([
      admin.database().ref(`${DATA_ROOT}/users/${uid}`).once('value'),
      admin.auth().getUser(uid),
    ]);
    const user = userSnapshot.val() || {};
    const phone = String(
      user.phone || user.profile?.phone || authUser.phoneNumber || '',
    )
      .replace(/\D/g, '')
      .slice(-10);
    if (phone.length !== 10) {
      return res.status(422).json({
        success: false,
        message: 'A valid 10-digit phone number is required for payment',
      });
    }
    const firstName = String(
      user.profile?.name ||
        user.profile?.tamilName ||
        authUser.displayName ||
        'Speakly User',
    ).slice(0, 60);
    const email = String(
      user.profile?.email ||
        authUser.email ||
        `payments+${sha512(uid).slice(0, 16)}@joinspeakly.com`,
    ).slice(0, 100);
    const transactionId = createTransactionId(uid);
    const now = Date.now();
    const payment: PaymentRecord = {
      transactionId,
      uid,
      packId,
      amount: pack.amount,
      bonus: pack.bonus,
      creditedAmount: pack.amount + pack.bonus,
      currency: 'INR',
      status: 'initiated',
      createdAt: now,
      updatedAt: now,
    };
    await admin
      .database()
      .ref(DATA_ROOT)
      .update({
        [`payments/${transactionId}`]: payment,
        [`pendingPayments/${transactionId}`]: now,
        [`users/${uid}/paymentHistory/${transactionId}`]:
          publicPayment(payment),
      });
    const callbackBase = `https://us-central1-${
      process.env.GCLOUD_PROJECT || 'recent-chat-7fd34'
    }.cloudfunctions.net/api/payu/callback`;
    return res.status(201).json({
      success: true,
      data: {
        transaction: publicPayment(payment),
        paymentParams: {
          key: PAYU_MERCHANT_KEY,
          transactionId,
          amount: pack.amount.toFixed(2),
          productInfo: `Speakly Wallet Recharge ${pack.id}`,
          firstName,
          email,
          phone,
          android_surl: callbackBase,
          android_furl: callbackBase,
          ios_surl: callbackBase,
          ios_furl: callbackBase,
          environment: paymentEnvironment() === 'production' ? '0' : '1',
          userCredential: `${PAYU_MERCHANT_KEY}:${uid}`,
          userToken: uid,
          additionalParam: {
            udf1: uid,
            udf2: String(pack.id),
            udf3: transactionId,
          },
        },
      },
    });
  } catch (error: any) {
    logger.error('Initiate PayU payment failed', error);
    const unauthenticated = error?.message === 'UNAUTHENTICATED';
    return res.status(unauthenticated ? 401 : 500).json({
      success: false,
      message: unauthenticated
        ? 'Authentication required'
        : 'Unable to start payment',
    });
  }
};

export const generatePaymentHash = async (req: Request, res: Response) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const transactionId = String(req.body?.transactionId || '');
    const hashString = String(req.body?.hashString || '');
    const postSalt = String(req.body?.postSalt || '');
    if (
      !transactionId ||
      !hashString ||
      hashString.length > 4096 ||
      postSalt.length > 4096
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid hash request' });
    }
    const snapshot = await admin
      .database()
      .ref(`${PAYMENT_ROOT}/${transactionId}`)
      .once('value');
    const payment = snapshot.val() as PaymentRecord | null;
    if (!payment || payment.uid !== uid || payment.status === 'success') {
      return res
        .status(403)
        .json({ success: false, message: 'Payment is not available' });
    }
    return res.json({
      success: true,
      hash: sha512(`${hashString}${PAYU_MERCHANT_SALT}${postSalt}`),
    });
  } catch (error: any) {
    logger.error('Generate PayU hash failed', error);
    return res.status(error?.message === 'UNAUTHENTICATED' ? 401 : 500).json({
      success: false,
      message: 'Unable to generate payment hash',
    });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const transactionId = String(req.params.transactionId || '');
    const snapshot = await admin
      .database()
      .ref(`${PAYMENT_ROOT}/${transactionId}`)
      .once('value');
    const payment = snapshot.val() as PaymentRecord | null;
    if (!payment || payment.uid !== uid) {
      return res
        .status(404)
        .json({ success: false, message: 'Payment not found' });
    }
    const finalPayment = await verifyAndFinalize(transactionId);
    return res.json({ success: true, data: publicPayment(finalPayment) });
  } catch (error: any) {
    logger.error('Verify PayU payment failed', error);
    const unauthenticated = error?.message === 'UNAUTHENTICATED';
    return res.status(unauthenticated ? 401 : 502).json({
      success: false,
      message: unauthenticated
        ? 'Authentication required'
        : 'Unable to verify payment',
    });
  }
};

export const listPayments = async (req: Request, res: Response) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const snapshot = await admin
      .database()
      .ref(`${DATA_ROOT}/users/${uid}/paymentHistory`)
      .once('value');
    const payments = Object.values(snapshot.val() || {}) as PaymentRecord[];
    payments.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return res.json({ success: true, data: payments.slice(0, 100) });
  } catch (error: any) {
    logger.error('List payments failed', error);
    return res.status(error?.message === 'UNAUTHENTICATED' ? 401 : 500).json({
      success: false,
      message: 'Unable to load payment history',
    });
  }
};

const responseHashIsValid = (body: Record<string, any>) => {
  const fields = [
    PAYU_MERCHANT_SALT,
    String(body.status || ''),
    '',
    '',
    '',
    '',
    '',
    String(body.udf5 || ''),
    String(body.udf4 || ''),
    String(body.udf3 || ''),
    String(body.udf2 || ''),
    String(body.udf1 || ''),
    String(body.email || ''),
    String(body.firstname || ''),
    String(body.productinfo || ''),
    String(body.amount || ''),
    String(body.txnid || ''),
    String(body.key || ''),
  ];
  let expected = sha512(fields.join('|'));
  if (body.additionalCharges) {
    expected = sha512(`${body.additionalCharges}|${fields.join('|')}`);
  }
  const received = String(body.hash || '').toLowerCase();
  return (
    received.length === expected.length &&
    timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  );
};

export const payuWebhook = async (req: Request, res: Response) => {
  const transactionId = String(req.body?.txnid || '');
  try {
    if (!transactionId || !responseHashIsValid(req.body || {})) {
      return res.status(400).send('Invalid PayU response');
    }
    await verifyAndFinalize(transactionId);
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('PayU webhook processing failed', { transactionId, error });
    return res.status(500).send('Unable to process payment');
  }
};

export const reconcilePayuPayments = onSchedule(
  {
    schedule: 'every 10 minutes',
    timeZone: 'Asia/Kolkata',
    timeoutSeconds: 300,
  },
  async () => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const indexSnapshot = await admin
      .database()
      .ref(`${DATA_ROOT}/pendingPayments`)
      .orderByValue()
      .limitToFirst(RECONCILE_LIMIT)
      .once('value');
    const transactionIds = Object.keys(indexSnapshot.val() || {});
    const payments = await Promise.all(
      transactionIds.map(async transactionId => {
        const snapshot = await admin
          .database()
          .ref(`${PAYMENT_ROOT}/${transactionId}`)
          .once('value');
        return snapshot.val() as PaymentRecord | null;
      }),
    );
    const pending = payments.filter(
      (payment): payment is PaymentRecord =>
        payment !== null &&
        ['initiated', 'pending', 'crediting'].includes(payment.status),
    );
    for (const payment of pending) {
      try {
        const result = await verifyAndFinalize(payment.transactionId);
        if (result.status === 'pending' && Number(result.createdAt) < cutoff) {
          await updatePaymentStatus(result, {
            status: 'failed',
            failureReason: 'Payment verification expired',
          });
        }
      } catch (error) {
        logger.error('Scheduled PayU reconciliation failed', {
          transactionId: payment.transactionId,
          error,
        });
      }
    }
    logger.info('PayU reconciliation complete', { checked: pending.length });
  },
);
