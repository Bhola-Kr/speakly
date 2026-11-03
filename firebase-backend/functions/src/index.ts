import { onRequest } from 'firebase-functions/v1/https';
import { logger } from 'firebase-functions';
import express, { Request, Response } from 'express';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import * as admin from 'firebase-admin';
import { RECHARGE_PACKS } from './constants';
import {
  generatePaymentHash,
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
  getMyExpertCompensation,
  settleExpertEarnings,
  updateExpertCompensation,
} from './expertCompensation';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const serviceAccount = require('../adminsdk.json');
const FIREBASE_PROJECT_ID = 'recent-chat-7fd34';
const FIREBASE_DATA_ROOT = 'speakly';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: FIREBASE_PROJECT_ID,
  databaseURL: 'https://recent-chat-7fd34-default-rtdb.firebaseio.com',
});

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
  const tokenSnapshot = await admin
    .database()
    .ref(`${FIREBASE_DATA_ROOT}/users/${uid}/fcmTokens`)
    .once('value');
  const tokenData = tokenSnapshot.val();
  const token = typeof tokenData === 'string' ? tokenData : tokenData?.token;

  return typeof token === 'string' && token.trim() ? token.trim() : null;
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
        message: 'Valid chat notification data is required',
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
      message: 'Unable to send chat notification',
    });
  }
});

app.post('/sendCallNotification', async (req: Request, res: Response) => {
  try {
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
        message: 'Valid incoming call notification data is required',
      });
    }

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
              title: 'Incoming Voice Call',
              body: `${callerName.trim()} is calling you`,
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
      message: 'Unable to send incoming call notification',
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
      message: 'Unable to get recharge packs',
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

// ============================================
// MSG91 OTP WIDGET - SEND OTP
// ============================================
app.post('/sendOtp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'phone is required',
      });
    }

    if (!MSG91_AUTH_KEY) {
      return res.status(500).json({
        success: false,
        message: 'MSG91 auth key is not configured',
      });
    }

    if (!MSG91_WIDGET_ID) {
      return res.status(500).json({
        success: false,
        message: 'MSG91 widget ID is not configured',
      });
    }

    const mobile = normalizePhone(phone);

    if (mobile.length !== 12 || !mobile.startsWith('91')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Indian phone number',
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
        message: data?.message || 'Unable to send OTP',
      });
    }

    // MSG91 returns reqId in data.message
    const reqId = data?.message;

    if (!reqId) {
      return res.status(500).json({
        success: false,
        message: 'MSG91 did not return reqId',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      reqId,
    });
  } catch (error) {
    logger.error('MSG91 Send OTP Error', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to send OTP',
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
        message: 'phone is required',
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'otp is required',
      });
    }

    if (!reqId) {
      return res.status(400).json({
        success: false,
        message: 'reqId is required',
      });
    }

    if (!MSG91_AUTH_KEY) {
      return res.status(500).json({
        success: false,
        message: 'MSG91 auth key is not configured',
      });
    }

    if (!MSG91_WIDGET_ID) {
      return res.status(500).json({
        success: false,
        message: 'MSG91 widget ID is not configured',
      });
    }

    const mobile = normalizePhone(phone);

    if (mobile.length !== 12 || !mobile.startsWith('91')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Indian phone number',
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
        message: verifyOtpData?.message || 'Invalid OTP',
      });
    }

    const accessToken = verifyOtpData?.message || verifyOtpData?.data?.message;

    if (!accessToken) {
      logger.error('MSG91 did not return access token', {
        verifyOtpData,
      });

      return res.status(500).json({
        success: false,
        message: 'MSG91 access token was not returned',
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
        message:
          verifyAccessTokenData?.message ||
          verifyAccessTokenData?.data?.message ||
          'Invalid MSG91 access token',
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
      message: 'OTP verified successfully',
      uid,
      token: firebaseToken,
    });
  } catch (error) {
    logger.error('MSG91 Verify OTP Error', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to verify OTP',
    });
  }
});

app.post('/resendOtp', async (req: Request, res: Response) => {
  try {
    const { phone, reqId } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'phone is required',
      });
    }

    if (!reqId) {
      return res.status(400).json({
        success: false,
        message: 'reqId is required',
      });
    }

    if (!MSG91_AUTH_KEY) {
      return res.status(500).json({
        success: false,
        message: 'MSG91 auth key is not configured',
      });
    }

    if (!MSG91_WIDGET_ID) {
      return res.status(500).json({
        success: false,
        message: 'MSG91 widget ID is not configured',
      });
    }

    const mobile = normalizePhone(phone);

    if (mobile.length !== 12 || !mobile.startsWith('91')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Indian phone number',
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
        message: data?.message || 'Unable to resend OTP',
      });
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data,
    });
  } catch (error) {
    logger.error('MSG91 Resend OTP Error', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to resend OTP',
    });
  }
});

// ============================================
// AGORA TOKEN
// ============================================
app.post('/generateAgoraToken', (req: Request, res: Response) => {
  try {
    const appId = 'f6bec5b940ea4b11af21f3b931f73536';
    const appCertificate = 'a9aa916ebcc840ad920582398c5a9f64';

    const channelName = 'voice_tamil';

    const maleUid = Math.floor(Math.random() * 100000);
    const femaleUid = Math.floor(Math.random() * 100000);

    const expireSeconds = 60 * 60 * 24;

    const currentTimestamp = Math.floor(Date.now() / 1000);

    const privilegeExpire = currentTimestamp + expireSeconds;

    const maleToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      maleUid,
      RtcRole.PUBLISHER,
      privilegeExpire,
      privilegeExpire,
    );

    const femaleToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      femaleUid,
      RtcRole.PUBLISHER,
      privilegeExpire,
      privilegeExpire,
    );

    return res.status(200).json({
      success: true,
      appId,
      channelName,
      expiresAt: privilegeExpire,

      male: {
        uid: maleUid,
        token: maleToken,
      },

      female: {
        uid: femaleUid,
        token: femaleToken,
      },
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: 'Unable to generate Agora tokens',
    });
  }
});

// ============================================
// FIREBASE CUSTOM TOKEN
// ============================================
app.post('/generateFirebaseToken', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'phone is required',
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
export { reconcilePayuPayments };
export const api = onRequest(
  {
    cors: true,
  },
  app,
);
