import { onRequest } from 'firebase-functions/v1/https';
import { logger } from 'firebase-functions';
import express, { Request, Response } from 'express';
import { createAgoraTokenHandler } from './rtcAuthorization';
import * as admin from 'firebase-admin';
import { RECHARGE_PACKS } from './constants';
import {
  generatePaymentHash,
  claimSignupOffer,
  confirmPayment,
  confirmRazorpayPayment,
  initiatePayment,
  initiateRazorpayPayment,
  listPayments,
  payuWebhook,
  razorpayWebhook,
  reconcilePayuPayments,
  verifyPayment,
} from './payments';
import {
  getExpertCompensationForAdmin,
  requestExpertWithdrawal,
  getMyExpertCompensation,
  notifyExpertApproval,
  notifyAdminsOfExpertApplication,
  notifyAdminsOnExpertApplicationCreated,
  settleExpertEarnings,
  updateExpertCompensation,
} from './expertCompensation';
import { notifyAdminsOnUserOnboarded } from './onboardingNotifications';
import { cleanupStaleCalls } from './staleCalls';
import { notifyAllUsersWhenExpertOnline } from './hostOnlineNotifications';

const app = express();
import { callSessionEvent, claimCall } from './callBilling';
import { registerPushToken, tokensForUser } from './pushTokenOwnership';
export { recordUnansweredCall, settleRecordedCall } from './callHistoryEvents';

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  ['/callSessionEvent', '/generateAgoraToken', '/claimCall'],
  async (req, res, next) => {
    if (req.header('X-Speakly-Call-Protocol') !== '2') {
      res.status(426).json({
        success: false,
        message: 'Speakly update karo aur phir connect karo.',
      });
      return;
    }
    next();
  },
);
app.post('/callSessionEvent', callSessionEvent);
app.post('/claimCall', claimCall);
app.post('/registerPushToken', registerPushToken);
app.post('/claimSignupOffer', claimSignupOffer);
app.post('/requestExpertWithdrawal', requestExpertWithdrawal);

const FIREBASE_PROJECT_ID = 'recent-chat-7fd34';
const FIREBASE_DATA_ROOT = 'speakly';

if (!admin.apps.length) {
  const localProject = process.env.GCLOUD_PROJECT || '';
  if (
    process.env.FUNCTIONS_EMULATOR === 'true' &&
    localProject.startsWith('demo-') &&
    process.env.FIREBASE_DATABASE_EMULATOR_HOST
  ) {
    admin.initializeApp({
      projectId: localProject,
      databaseURL: `https://${localProject}-default-rtdb.firebaseio.com`,
    });
  } else {
    const serviceAccount = require('../adminsdk.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID,
      databaseURL: 'https://recent-chat-7fd34-default-rtdb.firebaseio.com',
    });
  }
}

const MSG91_WIDGET_ID = '3668716f3732343639373333';
const MSG91_AUTH_KEY = '556220AsRGad8ZeTT6a848e8fP1';

function normalizePhone(phone: string): string {
  const mobile = phone.replace(/\D/g, '');
  if (mobile.length === 10) {
    return `91${mobile}`;
  }

  return mobile;
}

app.get('/myIp', async (_req, res) => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();

    logger.info('Firebase outbound IP', data);

    return res.json(data);
  } catch (error) {
    logger.error('IP check failed', error);

    return res.status(500).json({
      success: false,
    });
  }
});

async function getUserFcmToken(uid: string) {
  return (await tokensForUser(uid))[0] || null;
}

app.post('/sendChatNotification', async (req: Request, res: Response) => {
  try {
    const {
      type,
      recipientUid,
      senderUid,
      senderName,
      conversationId,
      messageId,
      messageType,
      preview,
    } = req.body;

    if (
      type !== 'chat_message' ||
      typeof recipientUid !== 'string' ||
      !recipientUid.trim() ||
      typeof senderUid !== 'string' ||
      !senderUid.trim() ||
      typeof senderName !== 'string' ||
      !senderName.trim() ||
      typeof conversationId !== 'string' ||
      !conversationId.trim() ||
      typeof messageId !== 'string' ||
      !messageId.trim() ||
      (messageType !== 'text' && messageType !== 'voice') ||
      typeof preview !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Chat notification ki details sahi nahi hain.',
      });
    }

    const fcmToken = await getUserFcmToken(recipientUid.trim());

    if (!fcmToken) {
      return res.status(200).json({ success: true, delivered: false });
    }

    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: senderName.trim().slice(0, 100),
        body: preview.slice(0, 200),
      },
      data: {
        type: 'chat_message',
        senderUid: senderUid.trim(),
        senderName: senderName.trim(),
        conversationId: conversationId.trim(),
        messageId: messageId.trim(),
        messageType,
        recipientUid: recipientUid.trim(),
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    return res.status(200).json({ success: true, delivered: true });
  } catch (error) {
    logger.error('Send Chat Notification Error', error);

    return res.status(500).json({
      success: false,
      message: 'Chat notification nahi gayi.',
    });
  }
});

app.post('/sendCallNotification', async (req: Request, res: Response) => {
  try {
    const sender = await admin
      .auth()
      .verifyIdToken(
        String(req.headers.authorization || '').replace(/^Bearer /, ''),
      );
    const { type, recipientUid, femaleUid, callId, callerName } = req.body;

    if (
      type !== 'incoming_call' ||
      typeof recipientUid !== 'string' ||
      !recipientUid.trim() ||
      typeof femaleUid !== 'string' ||
      !femaleUid.trim() ||
      recipientUid.trim() !== femaleUid.trim() ||
      typeof callId !== 'string' ||
      !callId.trim() ||
      typeof callerName !== 'string' ||
      !callerName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Incoming call ki details sahi nahi hain.',
      });
    }

    const session = (
      await admin
        .database()
        .ref(`${FIREBASE_DATA_ROOT}/rooms/${femaleUid}`)
        .once('value')
    ).val();
    if (
      session?.male?.uid !== sender.uid ||
      session?.currentCallId !== callId ||
      !['calling', 'ringing'].includes(session?.status)
    )
      return res
        .status(403)
        .json({ success: false, message: 'Call access nahi mila.' });
    const fcmToken = await getUserFcmToken(recipientUid.trim());
    if (!fcmToken) {
      return res.status(200).json({ success: true, delivered: false });
    }

    // Android receives data-only delivery so the app can build its full-screen
    // Notifee notification. APNs receives the registered actionable category.
    await admin.messaging().send({
      token: fcmToken,
      data: {
        type: 'incoming_call',
        recipientUid: recipientUid.trim(),
        femaleUid: femaleUid.trim(),
        callId: callId.trim(),
        callerName: callerName.trim(),
      },
      android: { priority: 'high' },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title: 'Nayi Call Aa Rahi Hai',
              body: `${callerName.trim()} aapko call kar rahe hain`,
            },
            category: 'incoming-call',
            sound: 'default',
          },
        },
      },
    });

    return res.status(200).json({ success: true, delivered: true });
  } catch (error) {
    logger.error('Send Call Notification Error', error);

    return res.status(500).json({
      success: false,
      message: 'Incoming call ki notification nahi gayi.',
    });
  }
});

app.get('/rechargePacks', async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: RECHARGE_PACKS,
    });
  } catch (error) {
    logger.error('Get Recharge Packs Error', error);

    return res.status(500).json({
      success: false,
      message: 'Recharge packs load nahi hue.',
    });
  }
});

app.post('/payments/initiate', initiatePayment);
app.post('/payments/razorpay/initiate', initiateRazorpayPayment);
app.post('/payments/hash', generatePaymentHash);
app.post('/payments/:transactionId/confirm', confirmPayment);
app.post('/payments/:transactionId/razorpay/confirm', confirmRazorpayPayment);
app.post('/payments/:transactionId/verify', verifyPayment);
app.get('/payments', listPayments);
app.post('/payu/callback', payuWebhook);
app.post('/razorpay/webhook', razorpayWebhook);
app.get('/expert-compensation/me', getMyExpertCompensation);
app.get('/admin/users/:uid/expert-compensation', getExpertCompensationForAdmin);
app.put('/admin/users/:uid/expert-compensation', updateExpertCompensation);
app.post('/calls/:callId/settle-expert-earnings', settleExpertEarnings);
app.post(
  '/admin/users/:uid/expert-approval-notification',
  notifyExpertApproval,
);
app.post('/expert-applications/notify-admins', notifyAdminsOfExpertApplication);

// ============================================
// MSG91 OTP WIDGET - SEND OTP
// ============================================
app.post('/sendOtp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number zaroori hai.',
      });
    }

    if (!MSG91_AUTH_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OTP service abhi ready nahi hai.',
      });
    }

    if (!MSG91_WIDGET_ID) {
      return res.status(500).json({
        success: false,
        message: 'OTP service abhi ready nahi hai.',
      });
    }

    const mobile = normalizePhone(phone);

    if (mobile.length !== 12 || !mobile.startsWith('91')) {
      return res.status(400).json({
        success: false,
        message: 'Sahi Indian mobile number likho.',
      });
    }

    const response = await fetch(
      'https://api.msg91.com/api/v5/widget/sendOtp',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          authkey: MSG91_AUTH_KEY,
        },
        body: JSON.stringify({
          widgetId: MSG91_WIDGET_ID,
          identifier: mobile,
        }),
      },
    );

    const data = await response.json();

    logger.info('MSG91 Send OTP Response', {
      status: response.status,
      data,
    });

    if (!response.ok || data?.type === 'error') {
      return res.status(400).json({
        success: false,
        message: 'OTP nahi gaya. Dobara try karo.',
      });
    }

    // MSG91 returns reqId in data.message
    const reqId = data?.message;

    if (!reqId) {
      return res.status(500).json({
        success: false,
        message: 'OTP ki request verify nahi hui.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP bhej diya gaya hai.',
      reqId,
    });
  } catch (error) {
    logger.error('MSG91 Send OTP Error', error);

    return res.status(500).json({
      success: false,
      message: 'OTP nahi gaya',
    });
  }
});

// ============================================
// MSG91 OTP WIDGET - VERIFY OTP
// ============================================
app.post('/verifyOtp', async (req: Request, res: Response) => {
  try {
    const { phone, otp, reqId } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number zaroori hai.',
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP zaroori hai.',
      });
    }

    if (!reqId) {
      return res.status(400).json({
        success: false,
        message: 'Naya OTP mangao.',
      });
    }

    if (!MSG91_AUTH_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OTP service abhi ready nahi hai.',
      });
    }

    if (!MSG91_WIDGET_ID) {
      return res.status(500).json({
        success: false,
        message: 'OTP service abhi ready nahi hai.',
      });
    }

    const mobile = normalizePhone(phone);

    if (mobile.length !== 12 || !mobile.startsWith('91')) {
      return res.status(400).json({
        success: false,
        message: 'Sahi Indian mobile number likho.',
      });
    }

    // ==========================================
    // STEP 1: VERIFY OTP
    // ==========================================

    const verifyOtpResponse = await fetch(
      'https://api.msg91.com/api/v5/widget/verifyOtp',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: MSG91_AUTH_KEY,
        },
        body: JSON.stringify({
          widgetId: MSG91_WIDGET_ID,
          identifier: mobile,
          reqId,
          otp: String(otp),
        }),
      },
    );

    const verifyOtpData = await verifyOtpResponse.json();

    logger.info('MSG91 Verify OTP Response', {
      status: verifyOtpResponse.status,
      data: verifyOtpData,
    });

    if (!verifyOtpResponse.ok || verifyOtpData?.type === 'error') {
      return res.status(401).json({
        success: false,
        message: 'OTP sahi nahi hai. Dobara try karo.',
      });
    }

    const accessToken = verifyOtpData?.message || verifyOtpData?.data?.message;

    if (!accessToken) {
      logger.error('MSG91 did not return access token', {
        verifyOtpData,
      });

      return res.status(500).json({
        success: false,
        message: 'OTP session verify nahi hua.',
      });
    }

    logger.info('MSG91 Access Token Received', {
      accessTokenReceived: true,
    });

    // ==========================================
    // STEP 3: VERIFY ACCESS TOKEN
    // ==========================================

    const verifyAccessTokenResponse = await fetch(
      'https://control.msg91.com/api/v5/widget/verifyAccessToken',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authkey: MSG91_AUTH_KEY,
          'access-token': accessToken,
        }),
      },
    );

    const verifyAccessTokenData = await verifyAccessTokenResponse.json();

    logger.info('MSG91 Verify Access Token Response', {
      status: verifyAccessTokenResponse.status,
      data: verifyAccessTokenData,
    });

    if (
      !verifyAccessTokenResponse.ok ||
      verifyAccessTokenData?.type === 'error' ||
      verifyAccessTokenData?.data?.type === 'error'
    ) {
      return res.status(401).json({
        success: false,
        message: 'OTP session verify nahi hui. Naya OTP mangao.',
      });
    }

    // ==========================================
    // STEP 4: OTP VERIFIED
    // ==========================================

    const uid = mobile;

    try {
      await admin.auth().getUser(uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        await admin.auth().createUser({
          uid,
          phoneNumber: `+${uid}`,
        });
      } else {
        throw error;
      }
    }

    // ==========================================
    // STEP 5: FIREBASE CUSTOM TOKEN
    // ==========================================

    const firebaseToken = await admin.auth().createCustomToken(uid);

    return res.status(200).json({
      success: true,
      message: 'OTP verify ho gaya.',
      uid,
      token: firebaseToken,
    });
  } catch (error) {
    logger.error('MSG91 Verify OTP Error', error);

    return res.status(500).json({
      success: false,
      message: 'OTP verify nahi hua.',
    });
  }
});

app.post('/resendOtp', async (req: Request, res: Response) => {
  try {
    const { phone, reqId } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number zaroori hai.',
      });
    }

    if (!reqId) {
      return res.status(400).json({
        success: false,
        message: 'Naya OTP mangao.',
      });
    }

    if (!MSG91_AUTH_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OTP service abhi ready nahi hai.',
      });
    }

    if (!MSG91_WIDGET_ID) {
      return res.status(500).json({
        success: false,
        message: 'OTP service abhi ready nahi hai.',
      });
    }

    const mobile = normalizePhone(phone);

    if (mobile.length !== 12 || !mobile.startsWith('91')) {
      return res.status(400).json({
        success: false,
        message: 'Sahi Indian mobile number likho.',
      });
    }

    // ==========================================
    // MSG91 RETRY OTP
    // ==========================================

    const body: Record<string, any> = {
      widgetId: MSG91_WIDGET_ID,
      identifier: mobile,
      reqId,
    };

    body.retryChannel = 11;
    const response = await fetch(
      'https://api.msg91.com/api/v5/widget/retryOtp',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: MSG91_AUTH_KEY,
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    logger.info('MSG91 Resend OTP Response', {
      status: response.status,
      data,
    });

    // ==========================================
    // MSG91 ERROR
    // ==========================================

    if (!response.ok || data?.type === 'error') {
      return res.status(400).json({
        success: false,
        message: 'OTP dobara nahi gaya. Thodi der baad try karo.',
      });
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(200).json({
      success: true,
      message: 'OTP dobara bhej diya gaya hai.',
      data,
    });
  } catch (error) {
    logger.error('MSG91 Resend OTP Error', error);

    return res.status(500).json({
      success: false,
      message: 'OTP dobara nahi gaya',
    });
  }
});

// ============================================
// AGORA TOKEN
// ============================================
app.post(
  '/generateAgoraToken',
  createAgoraTokenHandler(
    'f6bec5b940ea4b11af21f3b931f73536',
    'a9aa916ebcc840ad920582398c5a9f64',
  ),
);

// ============================================
// FIREBASE CUSTOM TOKEN
// ============================================
app.post('/generateFirebaseToken', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number zaroori hai.',
      });
    }

    const uid = normalizePhone(phone);

    try {
      await admin.auth().getUser(uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        await admin.auth().createUser({
          uid,
          phoneNumber: `+${uid}`,
        });
      } else {
        throw error;
      }
    }

    const token = await admin.auth().createCustomToken(uid);

    return res.status(200).json({
      success: true,
      uid,
      token,
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: 'Unable to generate Firebase token',
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Voice Tamil API Running 🚀',
  });
});

// ============================================
// FIREBASE FUNCTION
// ============================================
export {
  reconcilePayuPayments,
  notifyAdminsOnExpertApplicationCreated,
  notifyAdminsOnUserOnboarded,
  cleanupStaleCalls,
  notifyAllUsersWhenExpertOnline,
};
export const api = onRequest(
  {
    cors: true,
  },
  app,
);
