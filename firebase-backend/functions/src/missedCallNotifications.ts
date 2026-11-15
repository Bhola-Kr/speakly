import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onValueWritten } from 'firebase-functions/v2/database';

const DATA_ROOT = 'speakly';

export const notifyExpertOfMissedCall = onValueWritten(
  {
    ref: '/speakly/callHistory/{uid}/{callId}',
    retry: true,
  },
  async event => {
    const expertUid = String(event.params.uid || '');
    const callId = String(event.params.callId || '');
    const history = event.data.after.val();
    if (!expertUid || !callId || history?.status !== 'Missed') return;

    const database = admin.database();
    const [expertSnapshot, tokenSnapshot] = await Promise.all([
      database.ref(`${DATA_ROOT}/users/${expertUid}`).once('value'),
      database.ref(`${DATA_ROOT}/users/${expertUid}/fcmTokens`).once('value'),
    ]);
    const expert = expertSnapshot.val();
    if (
      !expert ||
      (expert.isExpert !== true && expert.profile?.role !== 'expert')
    ) {
      return;
    }

    const notificationRef = database.ref(
      `${DATA_ROOT}/missedCallNotificationClaims/${expertUid}/${callId}`,
    );
    const claim = await notificationRef.transaction(current => {
      if (current) return;
      return { claimedAt: Date.now() };
    });
    if (!claim.committed) return;

    const tokenData = tokenSnapshot.val();
    const token = typeof tokenData === 'string' ? tokenData : tokenData?.token;
    if (typeof token !== 'string' || !token.trim()) {
      await notificationRef.remove();
      logger.warn('Missed-call notification has no expert FCM token', {
        expertUid,
        callId,
      });
      return;
    }

    const callerName = String(
      history.maleInfo?.name || history.maleInfo?.tamilName || 'Someone',
    ).trim();
    const title = 'Missed voice call';
    const body = `${callerName} tried to reach you. Tap to return their call.`;
    try {
      const messageId = await admin.messaging().send({
        token: token.trim(),
        data: {
          type: 'missed_call',
          callId,
          femaleUid: expertUid,
          callerName,
          title,
          body,
        },
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert',
            'apns-collapse-id': `call-${callId}`,
          },
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
            },
          },
        },
      });
      await notificationRef.set({
        claimedAt: claim.snapshot.val()?.claimedAt || Date.now(),
        sentAt: Date.now(),
        messageId,
      });
    } catch (error) {
      await notificationRef.remove();
      logger.error('Unable to send expert missed-call notification', {
        expertUid,
        callId,
        error,
      });
      throw error;
    }
  },
);
