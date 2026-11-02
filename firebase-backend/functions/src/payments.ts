import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { RECHARGE_PACKS } from './constants';

// PayU live credentials. Keep the salt in backend code only; never return it
// to the mobile client or include it in the React Native bundle.
export const PAYU_MERCHANT_KEY = 'Rsdmix';
export const PAYU_MERCHANT_SALT = 'MLzzjEiz2FCsqQqj0SUqXJ2gVn7u0RLp';
const PAYU_ENVIRONMENT = 'production'
const RAZORPAY_KEY_ID = 'rzp_live_TvMDKDtzbCyqkh'
const RAZORPAY_KEY_SECRET = 'uRC4PD65JKygZ6gFdPQucd3h'
const RAZORPAY_WEBHOOK_SECRET = 'dc48bc67e925117c28d68cd5a799e3f4180f4410e5caa69a9007dd8a1298c06a'

const DATA_ROOT = 'speakly';
const PAYMENT_ROOT = `${DATA_ROOT}/payments`;
const RECONCILE_LIMIT = 50;

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
  provider?: 'payu' | 'razorpay';
  createdAt: number;
  updatedAt: number;
  creditingAt?: number;
  creditedAt?: number;
  payuId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  bankReferenceNumber?: string;
  paymentMode?: string;
  failureReason?: string;
};

const sha512 = (value: string) =>
  createHash('sha512').update(value, 'utf8').digest('hex');

const paymentEnvironment = () =>
  PAYU_ENVIRONMENT === 'production' ? 'production' : 'test';

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
  provider: payment.provider || 'payu',
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
  creditedAt: payment.creditedAt || null,
  payuId: payment.payuId || null,
  razorpayOrderId: payment.razorpayOrderId || null,
  razorpayPaymentId: payment.razorpayPaymentId || null,
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

const razorpayCredentials = () => {
  const keyId = RAZORPAY_KEY_ID;
  const keySecret = RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('RAZORPAY_NOT_CONFIGURED');
  return { keyId, keySecret };
};

const razorpayRequest = async (path: string, init?: RequestInit) => {
  const { keyId, keySecret } = razorpayCredentials();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // The status-aware error below is safer than exposing a provider response.
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.description || `Razorpay request failed (${response.status})`,
    );
  }
  return data;
};

const creditVerifiedPayment = async (payment: PaymentRecord, detail: any) => {
  const now = Date.now();
  const finalPayment: PaymentRecord = {
    ...payment,
    status: 'success',
    creditedAt: now,
    updatedAt: now,
    payuId: String(detail?.mihpayid || detail?.mihpayId || payment.payuId || ''),
    razorpayOrderId: String(
      detail?.razorpayOrderId || payment.razorpayOrderId || '',
    ),
    razorpayPaymentId: String(
      detail?.razorpayPaymentId || detail?.id || payment.razorpayPaymentId || '',
    ),
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
    .ref(`${DATA_ROOT}/users/${payment.uid}/wallet`)
    .transaction((current: any) => {
      const wallet = current && typeof current === 'object' ? current : {};
      const creditedPayments =
        wallet.creditedPayments && typeof wallet.creditedPayments === 'object'
          ? wallet.creditedPayments
          : {};
      if (creditedPayments[payment.transactionId]) return;
      const currentBalance = Number(wallet.balance);
      return {
        ...wallet,
        balance:
          (Number.isFinite(currentBalance) ? currentBalance : 0) +
          payment.creditedAmount,
        creditedPayments: {
          ...creditedPayments,
          [payment.transactionId]: now,
        },
      };
    });

  await admin
    .database()
    .ref(DATA_ROOT)
    .update({
      [`users/${payment.uid}/paymentHistory/${payment.transactionId}`]:
        publicPayment(finalPayment),
      [`payments/${payment.transactionId}`]: finalPayment,
      [`pendingPayments/${payment.transactionId}`]: null,
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

  if (payment.provider === 'razorpay') {
    if (!payment.razorpayOrderId) throw new Error('Razorpay order was not found');
    const payments = await razorpayRequest(
      `/orders/${encodeURIComponent(payment.razorpayOrderId)}/payments`,
    );
    const captured = (payments?.items || []).find(
      (item: any) =>
        item.status === 'captured' &&
        Number(item.amount) === Math.round(payment.amount * 100),
    );
    if (captured) {
      await creditVerifiedPayment(payment, {
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: captured.id,
        bankReferenceNumber:
          captured.acquirer_data?.rrn ||
          captured.acquirer_data?.bank_transaction_id,
        mode: captured.method,
      });
    } else {
      const failed = (payments?.items || []).find(
        (item: any) => item.status === 'failed',
      );
      await updatePaymentStatus(
        payment,
        failed
          ? {
              status: 'failed',
              failureReason: String(
                failed.error_description || 'Payment failed',
              ),
            }
          : { status: 'pending' },
      );
    }
    const finalSnapshot = await admin
      .database()
      .ref(`${PAYMENT_ROOT}/${transactionId}`)
      .once('value');
    return finalSnapshot.val() as PaymentRecord;
  }

  const { detail } = await verifyWithPayU(transactionId);
  if (!detail) {
    await updatePaymentStatus(payment, { status: 'pending' });
    return { ...payment, status: 'pending' as const };
  }
  const verifiedAmount = Number(
    detail.amt ?? detail.amount ?? detail.transaction_amount,
  );
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
      provider: 'payu',
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

export const initiateRazorpayPayment = async (req: Request, res: Response) => {
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
    const name = String(
      user.profile?.name ||
        user.profile?.tamilName ||
        authUser.displayName ||
        'Speakly User',
    ).slice(0, 60);
    const email = String(user.profile?.email || authUser.email || '').slice(
      0,
      100,
    );
    const transactionId = createTransactionId(uid);
    const order = await razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(pack.amount * 100),
        currency: 'INR',
        receipt: transactionId,
        payment_capture: 1,
        notes: { uid, packId: String(pack.id), transactionId },
      }),
    });
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
      provider: 'razorpay',
      razorpayOrderId: String(order.id),
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
    return res.status(201).json({
      success: true,
      data: {
        transaction: publicPayment(payment),
        checkoutOptions: {
          key: razorpayCredentials().keyId,
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          name: 'Speakly',
          description: `Speakly Wallet Recharge ${pack.id}`,
          prefill: { name, email, contact: phone },
          notes: { transactionId },
          theme: { color: '#7157F5' },
        },
      },
    });
  } catch (error: any) {
    logger.error('Initiate Razorpay payment failed', error);
    const unauthenticated = error?.message === 'UNAUTHENTICATED';
    const unconfigured = error?.message === 'RAZORPAY_NOT_CONFIGURED';
    return res.status(unauthenticated ? 401 : unconfigured ? 503 : 500).json({
      success: false,
      message: unauthenticated
        ? 'Authentication required'
        : unconfigured
          ? 'Razorpay is not configured'
          : 'Unable to start payment',
    });
  }
};

const safeSignatureEqual = (received: string, expected: string) =>
  received.length === expected.length &&
  timingSafeEqual(Buffer.from(received), Buffer.from(expected));

export const confirmRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const transactionId = String(req.params.transactionId || '');
    const snapshot = await admin
      .database()
      .ref(`${PAYMENT_ROOT}/${transactionId}`)
      .once('value');
    const payment = snapshot.val() as PaymentRecord | null;
    if (!payment || payment.uid !== uid || payment.provider !== 'razorpay') {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.status !== 'success') {
      const paymentId = String(req.body?.razorpay_payment_id || '');
      const orderId = String(req.body?.razorpay_order_id || '');
      const signature = String(req.body?.razorpay_signature || '');
      const expected = createHmac('sha256', razorpayCredentials().keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      if (
        !paymentId ||
        orderId !== payment.razorpayOrderId ||
        !safeSignatureEqual(signature, expected)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Razorpay payment response could not be verified',
        });
      }
      await updatePaymentStatus(payment, {
        status: 'pending',
        razorpayPaymentId: paymentId,
      });
      await verifyAndFinalize(transactionId);
    }
    const finalSnapshot = await admin
      .database()
      .ref(`${PAYMENT_ROOT}/${transactionId}`)
      .once('value');
    return res.json({
      success: true,
      data: publicPayment(finalSnapshot.val() as PaymentRecord),
    });
  } catch (error: any) {
    logger.error('Confirm Razorpay payment failed', error);
    return res.status(error?.message === 'UNAUTHENTICATED' ? 401 : 502).json({
      success: false,
      message:
        error?.message === 'UNAUTHENTICATED'
          ? 'Authentication required'
          : 'Unable to confirm payment',
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

const parsePayuResponse = (value: unknown): Record<string, any> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value !== 'string' || value.length > 20_000) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const finalizeSignedPayuResponse = async (
  payment: PaymentRecord,
  body: Record<string, any>,
) => {
  const transactionId = String(body.txnid || body.transactionId || '');
  const amount = Number(body.amount);
  const status = String(body.status || '').toLowerCase();
  if (
    transactionId !== payment.transactionId ||
    String(body.key || '') !== PAYU_MERCHANT_KEY ||
    !Number.isFinite(amount) ||
    amount !== payment.amount ||
    !responseHashIsValid(body)
  ) {
    throw new Error('INVALID_PAYU_RESPONSE');
  }
  if (status === 'success') {
    await creditVerifiedPayment(payment, body);
  } else if (['failure', 'failed'].includes(status)) {
    await updatePaymentStatus(payment, {
      status: 'failed',
      failureReason: String(
        body.error_Message || body.field9 || 'Payment failed',
      ),
    });
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
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
    if (payment.status !== 'success') {
      const payuResponse = parsePayuResponse(req.body?.payuResponse);
      if (!payuResponse) {
        return res.status(400).json({
          success: false,
          message: 'Invalid PayU payment response',
        });
      }
      await finalizeSignedPayuResponse(payment, payuResponse);
    }
    const finalSnapshot = await admin
      .database()
      .ref(`${PAYMENT_ROOT}/${transactionId}`)
      .once('value');
    return res.json({
      success: true,
      data: publicPayment(finalSnapshot.val() as PaymentRecord),
    });
  } catch (error: any) {
    logger.error('Confirm PayU payment failed', error);
    const unauthenticated = error?.message === 'UNAUTHENTICATED';
    const invalid = error?.message === 'INVALID_PAYU_RESPONSE';
    return res.status(unauthenticated ? 401 : invalid ? 400 : 500).json({
      success: false,
      message: unauthenticated
        ? 'Authentication required'
        : invalid
        ? 'PayU payment response could not be verified'
        : 'Unable to confirm payment',
    });
  }
};

export const payuWebhook = async (req: Request, res: Response) => {
  const transactionId = String(req.body?.txnid || '');
  try {
    if (!transactionId || !responseHashIsValid(req.body || {})) {
      return res.status(400).send('Invalid PayU response');
    }
    const snapshot = await admin
      .database()
      .ref(`${PAYMENT_ROOT}/${transactionId}`)
      .once('value');
    const payment = snapshot.val() as PaymentRecord | null;
    if (!payment) return res.status(404).send('Payment not found');
    await finalizeSignedPayuResponse(payment, req.body);
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('PayU webhook processing failed', { transactionId, error });
    return res.status(500).send('Unable to process payment');
  }
};

export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const secret = RAZORPAY_WEBHOOK_SECRET
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!secret || !signature || !rawBody) {
      return res.status(400).send('Invalid Razorpay webhook');
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeSignatureEqual(signature, expected)) {
      return res.status(400).send('Invalid Razorpay webhook');
    }
    const entity = req.body?.payload?.payment?.entity;
    const transactionId = String(entity?.notes?.transactionId || '');
    if (!transactionId) return res.status(200).send('Ignored');
    const snapshot = await admin
      .database()
      .ref(`${PAYMENT_ROOT}/${transactionId}`)
      .once('value');
    const payment = snapshot.val() as PaymentRecord | null;
    if (!payment || payment.provider !== 'razorpay') {
      return res.status(404).send('Payment not found');
    }
    if (entity?.id && !payment.razorpayPaymentId) {
      await updatePaymentStatus(payment, {
        status: 'pending',
        razorpayPaymentId: String(entity.id),
      });
    }
    await verifyAndFinalize(transactionId);
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('Razorpay webhook processing failed', error);
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
    // Do not use orderByValue here: production databases without an explicit
    // `.value` index reject that query, preventing every pending payment from
    // being reconciled. Sort the small pending index in memory instead.
    const indexSnapshot = await admin
      .database()
      .ref(`${DATA_ROOT}/pendingPayments`)
      .once('value');
    const transactionIds = Object.entries(indexSnapshot.val() || {})
      .sort(([, first], [, second]) => Number(first) - Number(second))
      .slice(0, RECONCILE_LIMIT)
      .map(([transactionId]) => transactionId);
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
        logger.error('Scheduled payment reconciliation failed', {
          transactionId: payment.transactionId,
          error,
        });
      }
    }
    logger.info('Payment reconciliation complete', { checked: pending.length });
  },
);
