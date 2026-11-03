import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const DATA_ROOT = 'speakly';
const DEFAULT_EXPERT_CALL_RATE_PER_MINUTE = 1;

const authenticatedUid = async (req: Request) => {
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) throw new Error('UNAUTHENTICATED');
  return (await admin.auth().verifyIdToken(authorization.slice(7).trim())).uid;
};

const requireAdmin = async (uid: string) => {
  const snapshot = await admin
    .database()
    .ref(`${DATA_ROOT}/users/${uid}/isAdmin`)
    .once('value');
  if (snapshot.val() !== true) throw new Error('FORBIDDEN');
};

const publicRate = (value: any, fallback: number) => {
  const configured = Number(value?.callRatePerMinute);
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
};

export const getMyExpertCompensation = async (req: Request, res: Response) => {
  try {
    const uid = await authenticatedUid(req);
    const [userSnapshot, compensationSnapshot] = await Promise.all([
      admin.database().ref(`${DATA_ROOT}/users/${uid}`).once('value'),
      admin
        .database()
        .ref(`${DATA_ROOT}/expertCompensation/${uid}`)
        .once('value'),
    ]);
    const user = userSnapshot.val() || {};
    if (user.isExpert !== true) {
      return res
        .status(403)
        .json({ success: false, message: 'Expert access is required' });
    }
    return res.json({
      success: true,
      data: {
        callRatePerMinute: publicRate(
          compensationSnapshot.val(),
          DEFAULT_EXPERT_CALL_RATE_PER_MINUTE,
        ),
      },
    });
  } catch (error: any) {
    logger.error('Get expert compensation failed', error);
    return res.status(error?.message === 'UNAUTHENTICATED' ? 401 : 500).json({
      success: false,
      message: 'Unable to load expert compensation',
    });
  }
};

export const getExpertCompensationForAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const adminUid = await authenticatedUid(req);
    await requireAdmin(adminUid);
    const expertUid = String(req.params.uid || '');
    const [userSnapshot, compensationSnapshot] = await Promise.all([
      admin.database().ref(`${DATA_ROOT}/users/${expertUid}`).once('value'),
      admin
        .database()
        .ref(`${DATA_ROOT}/expertCompensation/${expertUid}`)
        .once('value'),
    ]);
    const user = userSnapshot.val();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    return res.json({
      success: true,
      data: {
        callRatePerMinute: publicRate(
          compensationSnapshot.val(),
          DEFAULT_EXPERT_CALL_RATE_PER_MINUTE,
        ),
      },
    });
  } catch (error: any) {
    const status =
      error?.message === 'UNAUTHENTICATED'
        ? 401
        : error?.message === 'FORBIDDEN'
        ? 403
        : 500;
    return res
      .status(status)
      .json({ success: false, message: 'Unable to load expert compensation' });
  }
};

export const updateExpertCompensation = async (req: Request, res: Response) => {
  try {
    const adminUid = await authenticatedUid(req);
    await requireAdmin(adminUid);
    const expertUid = String(req.params.uid || '');
    const rate = Number(req.body?.callRatePerMinute);
    if (!Number.isFinite(rate) || rate <= 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Rate must be greater than zero' });
    }
    const userSnapshot = await admin
      .database()
      .ref(`${DATA_ROOT}/users/${expertUid}`)
      .once('value');
    if (userSnapshot.val()?.isExpert !== true) {
      return res
        .status(400)
        .json({ success: false, message: 'User is not an expert' });
    }
    await admin
      .database()
      .ref(`${DATA_ROOT}/expertCompensation/${expertUid}`)
      .set({
        callRatePerMinute: rate,
        updatedAt: Date.now(),
        updatedBy: adminUid,
      });
    return res.json({ success: true, data: { callRatePerMinute: rate } });
  } catch (error: any) {
    const status =
      error?.message === 'UNAUTHENTICATED'
        ? 401
        : error?.message === 'FORBIDDEN'
        ? 403
        : 500;
    return res.status(status).json({
      success: false,
      message: 'Unable to update expert compensation',
    });
  }
};

export const notifyExpertApproval = async (req: Request, res: Response) => {
  try {
    const adminUid = await authenticatedUid(req);
    await requireAdmin(adminUid);
    const expertUid = String(req.params.uid || '');
    const [userSnapshot, tokenSnapshot] = await Promise.all([
      admin.database().ref(`${DATA_ROOT}/users/${expertUid}`).once('value'),
      admin
        .database()
        .ref(`${DATA_ROOT}/users/${expertUid}/fcmTokens`)
        .once('value'),
    ]);
    const user = userSnapshot.val();
    if (!user || user.isExpert !== true) {
      return res
        .status(400)
        .json({ success: false, message: 'Approved expert not found' });
    }
    const tokenValue = tokenSnapshot.val();
    const token =
      typeof tokenValue === 'string' ? tokenValue : tokenValue?.token;
    if (typeof token !== 'string' || !token.trim()) {
      return res.json({ success: true, delivered: false });
    }
    await admin.messaging().send({
      token: token.trim(),
      notification: {
        title: 'Expert account approved',
        body: 'Your expert account has been approved. You can now go online, help learners, and start earning.',
      },
      data: { type: 'expert_approved' },
      android: { priority: 'high' },
      apns: {
        payload: { aps: { sound: 'default' } },
      },
    });
    return res.json({ success: true, delivered: true });
  } catch (error: any) {
    logger.error('Send expert approval notification failed', error);
    const status =
      error?.message === 'UNAUTHENTICATED'
        ? 401
        : error?.message === 'FORBIDDEN'
        ? 403
        : 500;
    return res.status(status).json({
      success: false,
      message: 'Unable to send expert approval notification',
    });
  }
};

export const settleExpertEarnings = async (req: Request, res: Response) => {
  try {
    const uid = await authenticatedUid(req);
    const callId = String(req.params.callId || '');
    const callerHistorySnapshot = await admin
      .database()
      .ref(`${DATA_ROOT}/callHistory/${uid}/${callId}`)
      .once('value');
    const history = callerHistorySnapshot.val();
    if (!history || history.status !== 'Completed') {
      return res
        .status(404)
        .json({ success: false, message: 'Completed call not found' });
    }
    const callerUid = String(history.maleInfo?.uid || '');
    const expertUid = String(history.femaleInfo?.uid || '');
    if (uid !== callerUid && uid !== expertUid) {
      return res
        .status(403)
        .json({ success: false, message: 'Call access denied' });
    }
    const callerRate = Number(history.callRatePerMinute);
    const chargedAmount = Number(history.amount);
    if (
      !expertUid ||
      !Number.isFinite(callerRate) ||
      callerRate <= 0 ||
      !Number.isFinite(chargedAmount) ||
      chargedAmount <= 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid call billing data' });
    }
    const compensationSnapshot = await admin
      .database()
      .ref(`${DATA_ROOT}/expertCompensation/${expertUid}`)
      .once('value');
    const expertRate = publicRate(
      compensationSnapshot.val(),
      DEFAULT_EXPERT_CALL_RATE_PER_MINUTE,
    );
    const paidMinutes = Math.max(1, Math.round(chargedAmount / callerRate));
    const expertAmount = paidMinutes * expertRate;
    await admin
      .database()
      .ref(`${DATA_ROOT}/users/${expertUid}/expertEarnings`)
      .transaction((value: any) => {
        const earnings = value && typeof value === 'object' ? value : {};
        const creditedCalls = earnings.creditedCalls || {};
        if (creditedCalls[callId]) return;
        return {
          ...earnings,
          total: Number(earnings.total || 0) + expertAmount,
          available: Number(earnings.available || 0) + expertAmount,
          withdrawn: Number(earnings.withdrawn || 0),
          creditedCalls: {
            ...creditedCalls,
            [callId]: {
              amount: expertAmount,
              minutes: paidMinutes,
              ratePerMinute: expertRate,
              creditedAt: Date.now(),
            },
          },
          updatedAt: Date.now(),
        };
      });
    return res.json({ success: true });
  } catch (error: any) {
    logger.error('Settle expert earnings failed', error);
    return res
      .status(error?.message === 'UNAUTHENTICATED' ? 401 : 500)
      .json({ success: false, message: 'Unable to settle expert earnings' });
  }
};
