import { tokensForUser, tokensForAdmins } from './pushTokenOwnership';
import { runDataTransaction } from './databaseTransaction';

export async function reserveExpertWithdrawal(uid: string) {
  const root = admin.database().ref(DATA_ROOT);
  const id = root.child('withdrawalRequests').push().key!;
  const now = Date.now();
  let failure = 'Withdrawal request nahi bani.';
  const result = await runDataTransaction(root, data => {
    const user = data?.users?.[uid];
    if (user?.isExpert !== true) {
      failure = 'Expert access zaroori hai.';
      return;
    }
    const earnings = user.expertEarnings || {};
    if (earnings.pendingWithdrawal?.id) {
      failure = 'Ek withdrawal request pehle se pending hai.';
      return;
    }
    const configured = Number(data.configs?.minimumWithdrawalAmount);
    const minimum =
      Number.isFinite(configured) && configured > 0 ? configured : 99;
    const available = Number(earnings.available || 0);
    if (!Number.isFinite(available) || available < minimum) {
      failure =
        available > 0
          ? `Minimum withdrawal amount ₹${minimum}.`
          : 'Withdrawal ke liye kamai available nahi hai.';
      return;
    }
    const request = {
      id,
      expertUid: uid,
      expertName: String(
        user.profile?.name || user.profile?.tamilName || 'Host',
      ),
      phone: String(user.phone || user.profile?.phone || ''),
      amount: available,
      status: 'pending',
      requestedAt: now,
      updatedAt: now,
    };
    user.expertEarnings = {
      ...earnings,
      available: 0,
      pendingWithdrawal: { id, amount: available, requestedAt: now },
      updatedAt: now,
    };
    data.withdrawalRequests ||= {};
    data.withdrawalRequests[id] = request;
    user.withdrawalRequests ||= {};
    user.withdrawalRequests[id] = request;
    return data;
  });
  if (!result.committed) throw new Error(failure);
  return result.snapshot.child(`withdrawalRequests/${id}`).val();
}

export async function requestExpertWithdrawal(req: Request, res: Response) {
  try {
    const uid = await authenticatedUid(req);
    return res.json({
      success: true,
      request: await reserveExpertWithdrawal(uid),
    });
  } catch (error: any) {
    return res.status(error?.message === 'UNAUTHENTICATED' ? 401 : 409).json({
      success: false,
      message:
        error?.message === 'UNAUTHENTICATED'
          ? 'Sign in zaroori hai.'
          : error?.message || 'Withdrawal request nahi bani.',
    });
  }
}
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onValueWritten } from 'firebase-functions/v2/database';

const DATA_ROOT = 'speakly';
const DEFAULT_EXPERT_CALL_RATE_PER_MINUTE = 1;
const GENERAL_NOTIFICATION_CHANNEL_ID = 'voicetamil_general';

const notificationDeliveryOptions = {
  android: {
    priority: 'high' as const,
    notification: {
      channelId: GENERAL_NOTIFICATION_CHANNEL_ID,
      sound: 'default',
    },
  },
  apns: {
    headers: {
      'apns-priority': '10',
      'apns-push-type': 'alert',
    },
    payload: { aps: { sound: 'default' } },
  },
};

const applicationNotificationPath =
  '/speakly/expertApplications/{applicantUid}';

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

export const creditExpertEarningsForCall = async (
  callId: string,
  history: any,
): Promise<number> => {
  const callerRate = Number(history.callRatePerMinute);
  const chargedAmount = Number(history.amount);
  const expertUid = String(history.femaleInfo?.uid || '');
  if (
    !callId ||
    !expertUid ||
    history.status !== 'Completed' ||
    !Number.isFinite(callerRate) ||
    callerRate <= 0 ||
    !Number.isFinite(chargedAmount) ||
    chargedAmount <= 0
  ) {
    return 0;
  }

  const expertRateSnapshot = await admin
    .database()
    .ref(`${DATA_ROOT}/expertCompensation/${expertUid}`)
    .once('value');
  const expertRate = publicRate(
    expertRateSnapshot.val(),
    DEFAULT_EXPERT_CALL_RATE_PER_MINUTE,
  );
  const paidMinutes =
    history.billingMode === 'prorated'
      ? Math.min(
          Math.ceil(Number(history.duration || 0) / 1000) / 60,
          chargedAmount / callerRate,
        )
      : history.billingMode === 'started-minute'
      ? Math.min(
          Number(history.billedMinutes || 0),
          Math.floor(
            Math.round(chargedAmount * 100) / Math.round(callerRate * 100),
          ),
        )
      : Math.floor(chargedAmount / callerRate);
  if (!Number.isFinite(paidMinutes) || paidMinutes <= 0) return 0;
  const expertAmount = Math.round(paidMinutes * expertRate * 100) / 100;
  if (expertAmount <= 0) return 0;
  const result = await admin
    .database()
    .ref(`${DATA_ROOT}/users/${expertUid}/expertEarnings`)
    .transaction((value: any) => {
      const earnings = value && typeof value === 'object' ? value : {};
      const creditedCalls = earnings.creditedCalls || {};
      if (creditedCalls[callId]) return earnings;
      return {
        ...earnings,
        total:
          Math.round((Number(earnings.total || 0) + expertAmount) * 100) / 100,
        available:
          Math.round((Number(earnings.available || 0) + expertAmount) * 100) /
          100,
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
  const credited = result.snapshot.val()?.creditedCalls?.[callId]?.amount;
  return Number(credited || 0);
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
        .json({ success: false, message: 'Expert access zaroori hai.' });
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
      message: 'Expert ki kamai ka rate load nahi hua.',
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
        .json({ success: false, message: 'User nahi mila' });
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
    return res.status(status).json({
      success: false,
      message: 'Expert ki kamai ka rate load nahi hua.',
    });
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
        .json({ success: false, message: 'Rate zero se zyada hona chahiye.' });
    }
    const userSnapshot = await admin
      .database()
      .ref(`${DATA_ROOT}/users/${expertUid}`)
      .once('value');
    if (userSnapshot.val()?.isExpert !== true) {
      return res
        .status(400)
        .json({ success: false, message: 'Yeh user expert nahi hai.' });
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
      message: 'Expert ki kamai ka rate update nahi hua.',
    });
  }
};

export const notifyExpertApproval = async (req: Request, res: Response) => {
  try {
    const adminUid = await authenticatedUid(req);
    await requireAdmin(adminUid);
    const expertUid = String(req.params.uid || '');
    const userSnapshot = await admin
      .database()
      .ref(`${DATA_ROOT}/users/${expertUid}`)
      .once('value');
    const user = userSnapshot.val();
    if (!user || user.isExpert !== true) {
      return res
        .status(400)
        .json({ success: false, message: 'Approved expert nahi mila.' });
    }
    const token = (await tokensForUser(expertUid))[0];
    if (typeof token !== 'string' || !token.trim()) {
      return res.json({ success: true, delivered: false });
    }
    await admin.messaging().send({
      token: token.trim(),
      notification: {
        title: '🎉 Congratulations! You are now a Speakly expert!',
        body: '🥳 Your account is active. Go online to start earning from calls and enjoy your early expert benefits! 💰',
      },
      data: { type: 'expert_approved' },
      ...notificationDeliveryOptions,
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
      message: 'Expert approval ki notification nahi gayi.',
    });
  }
};

const sendExpertApplicationNotificationToAdmins = async (
  applicantUid: string,
) => {
  const [applicationSnapshot, applicantSnapshot, usersSnapshot] =
    await Promise.all([
      admin
        .database()
        .ref(`${DATA_ROOT}/expertApplications/${applicantUid}`)
        .once('value'),
      admin.database().ref(`${DATA_ROOT}/users/${applicantUid}`).once('value'),
      admin.database().ref(`${DATA_ROOT}/users`).once('value'),
    ]);
  const application = applicationSnapshot.val();
  if (application?.uid !== applicantUid || application?.status !== 'pending') {
    throw new Error('PENDING_APPLICATION_NOT_FOUND');
  }

  const applicant = applicantSnapshot.val() || {};
  const applicantName = String(
    applicant.profile?.name || applicant.profile?.tamilName || 'A new expert',
  );
  const uniqueTokens = await tokensForAdmins(usersSnapshot.val());
  if (uniqueTokens.length === 0) return 0;

  const applicationRef = admin
    .database()
    .ref(`${DATA_ROOT}/expertApplications/${applicantUid}`);
  const notificationClaim = await applicationRef.transaction(current => {
    if (
      current?.uid !== applicantUid ||
      current?.status !== 'pending' ||
      current?.adminNotificationSentAt
    ) {
      return;
    }
    return { ...current, adminNotificationSentAt: Date.now() };
  });
  if (!notificationClaim.committed) return 0;

  let delivered = 0;
  try {
    for (let offset = 0; offset < uniqueTokens.length; offset += 500) {
      const result = await admin.messaging().sendEachForMulticast({
        tokens: uniqueTokens.slice(offset, offset + 500),
        notification: {
          title: 'New expert application',
          body: `${applicantName} submitted an expert verification application. Review it when you can.`,
        },
        data: {
          type: 'expert_application_submitted',
          applicantUid,
        },
        ...notificationDeliveryOptions,
      });
      delivered += result.successCount;
    }
  } catch (error) {
    await applicationRef.child('adminNotificationSentAt').remove();
    throw error;
  }

  if (delivered === 0) {
    await applicationRef.child('adminNotificationSentAt').remove();
  }
  return delivered;
};

export const notifyAdminsOnExpertApplicationCreated = onValueWritten(
  applicationNotificationPath,
  async event => {
    const applicantUid = String(event.params.applicantUid || '');
    const previousApplication = event.data.before.val();
    const application = event.data.after.val();
    const isNewSubmission =
      !previousApplication ||
      previousApplication.status !== 'pending' ||
      previousApplication.submittedAt !== application?.submittedAt;
    if (
      !applicantUid ||
      application?.uid !== applicantUid ||
      application?.status !== 'pending' ||
      !isNewSubmission
    ) {
      return;
    }

    const delivered = await sendExpertApplicationNotificationToAdmins(
      applicantUid,
    );
    logger.info('Expert application admin notifications processed', {
      applicantUid,
      delivered,
    });
  },
);

export const notifyAdminsOfExpertApplication = async (
  req: Request,
  res: Response,
) => {
  try {
    const applicantUid = await authenticatedUid(req);
    const delivered = await sendExpertApplicationNotificationToAdmins(
      applicantUid,
    );
    return res.json({ success: true, delivered });
  } catch (error: any) {
    logger.error('Notify admins of expert application failed', error);
    const status =
      error?.message === 'UNAUTHENTICATED'
        ? 401
        : error?.message === 'PENDING_APPLICATION_NOT_FOUND'
        ? 400
        : 500;
    return res.status(status).json({
      success: false,
      message:
        status === 400
          ? 'Pending expert application nahi mili.'
          : 'Admins ko notification nahi gayi.',
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
        .json({ success: false, message: 'Completed call nahi mili.' });
    }
    const callerUid = String(history.maleInfo?.uid || '');
    const expertUid = String(history.femaleInfo?.uid || '');
    if (uid !== callerUid && uid !== expertUid) {
      return res
        .status(403)
        .json({ success: false, message: 'Call access nahi mila.' });
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
      return res.status(400).json({
        success: false,
        message: 'Call ki billing details sahi nahi hain.',
      });
    }
    await creditExpertEarningsForCall(callId, history);
    return res.json({ success: true });
  } catch (error: any) {
    logger.error('Settle expert earnings failed', error);
    return res
      .status(error?.message === 'UNAUTHENTICATED' ? 401 : 500)
      .json({ success: false, message: 'Expert ki kamai settle nahi hui.' });
  }
};
