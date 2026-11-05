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
        title: '🎉 Congratulations! Aap Speakly Expert Ban Gayi Hain!',
        body: '🥳 Aapka account activate ho gaya hai! Abhi online aaiye, calls par earning shuru kijiye aur special early-expert benefits ka fayda uthaiye! 💰',
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
      message: 'Unable to send expert approval notification',
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
  const tokens: string[] = [];
  usersSnapshot.forEach(child => {
    const user = child.val();
    if (user?.isAdmin !== true) return;
    const tokenValue = user.fcmTokens;
    const token =
      typeof tokenValue === 'string' ? tokenValue : tokenValue?.token;
    if (typeof token === 'string' && token.trim()) tokens.push(token.trim());
  });
  const uniqueTokens = [...new Set(tokens)];
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
          body: `${applicantName} submitted an expert verification. Review and approve the application.`,
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
          ? 'Pending expert application not found'
          : 'Unable to notify administrators',
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
