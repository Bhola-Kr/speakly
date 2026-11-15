import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onValueWritten } from 'firebase-functions/v2/database';

const DATA_ROOT = 'speakly';
const EXPERT_STATUS_PATH = '/speakly/users/{hostUid}/profile/status';
const GENERAL_NOTIFICATION_CHANNEL_ID = 'voicetamil_general';

export const notifyAllUsersWhenExpertOnline = onValueWritten(
  EXPERT_STATUS_PATH,
  async event => {
    const hostUid = String(event.params.hostUid || '');
    const previousStatus = event.data.before.val();
    const nextStatus = event.data.after.val();
    if (!hostUid || previousStatus === 'online' || nextStatus !== 'online') {
      return;
    }

    const database = admin.database();
    const [hostSnapshot, usersSnapshot] = await Promise.all([
      database.ref(`${DATA_ROOT}/users/${hostUid}`).once('value'),
      database.ref(`${DATA_ROOT}/users`).once('value'),
    ]);
    const host = hostSnapshot.val();
    if (!host || (host.isExpert !== true && host.profile?.role !== 'expert')) {
      return;
    }

    const hostName = String(
      host.profile?.name || host.profile?.tamilName || 'A host',
    ).trim();
    const tokens = new Set<string>();
    usersSnapshot.forEach(userSnapshot => {
      if (userSnapshot.key === hostUid) return;
      const tokenData = userSnapshot.child('fcmTokens').val();
      const token = typeof tokenData === 'string' ? tokenData : tokenData?.token;
      if (typeof token === 'string' && token.trim()) tokens.add(token.trim());
    });

    const tokenList = [...tokens];
    for (let offset = 0; offset < tokenList.length; offset += 500) {
      const result = await admin.messaging().sendEachForMulticast({
        tokens: tokenList.slice(offset, offset + 500),
        notification: {
          title: `✨ ${hostName} is here!`,
          body: `Your next great conversation is waiting. Join ${hostName} for a voice session now!`,
        },
        data: {
          type: 'expert_online',
          hostUid,
          hostName,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: GENERAL_NOTIFICATION_CHANNEL_ID,
            sound: 'default',
          },
        },
        apns: {
          headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
          payload: { aps: { sound: 'default' } },
        },
      });
      logger.info('Expert online notifications sent', {
        hostUid,
        attempted: tokenList.slice(offset, offset + 500).length,
        delivered: result.successCount,
        failed: result.failureCount,
      });
    }
  },
);
