import { notificationAudience } from './pushTokenOwnership';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onValueWritten } from 'firebase-functions/v2/database';

const DATA_ROOT = 'speakly';
const EXPERT_STATUS_PATH = '/speakly/users/{hostUid}/profile/status';
const GENERAL_NOTIFICATION_CHANNEL_ID = 'voicetamil_general';
const TEST_HOST_PHONE = '8826520718';

const normalizePhone = (value: unknown) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(-10);

export const notifyAllUsersWhenExpertOnline = onValueWritten(
  EXPERT_STATUS_PATH,
  async event => {
    const hostUid = String(event.params.hostUid || '');
    const previousStatus = event.data.before.val();
    const nextStatus = event.data.after.val();
    if (
      !hostUid ||
      !['offline', null].includes(previousStatus) ||
      nextStatus !== 'online'
    ) {
      return;
    }

    const database = admin.database();
    const [hostSnapshot, usersSnapshot] = await Promise.all([
      database.ref(`${DATA_ROOT}/users/${hostUid}`).once('value'),
      database.ref(`${DATA_ROOT}/users`).once('value'),
    ]);
    const host = hostSnapshot.val();
    if (
      !host ||
      host.isExpert !== true ||
      host.settings?.voiceCallsEnabled === false
    ) {
      return;
    }
    const room = (
      await database.ref(`${DATA_ROOT}/rooms/${hostUid}`).once('value')
    ).val();
    if (room?.status !== 'waiting' || room?.female?.uid !== hostUid) return;
    const hostPhones = [host.phone, host.profile?.phone].map(normalizePhone);
    if (hostPhones.includes(TEST_HOST_PHONE)) {
      logger.info('Skipping expert online notification for test host', {
        hostUid,
      });
      return;
    }

    const hostName = String(
      host.profile?.name || host.profile?.tamilName || 'A host',
    ).trim();
    const registrations = await database
      .ref(`${DATA_ROOT}/pushTokenOwners`)
      .once('value');
    const tokenList = notificationAudience(
      usersSnapshot.val(),
      registrations.val(),
      'customer',
    );
    const claim = await database
      .ref(`${DATA_ROOT}/hostOnlineNotificationEvents/${event.id}`)
      .transaction(current => {
        if (current) return;
        return { hostUid, claimedAt: Date.now() };
      });
    if (!claim.committed) return;

    for (let offset = 0; offset < tokenList.length; offset += 500) {
      const result = await admin.messaging().sendEachForMulticast({
        tokens: tokenList.slice(offset, offset + 500),
        notification: {
          title: `${hostName} ab Online Hai! 🎉`,
          body: `${hostName} aapse baat karne ke liye ready hai. Connect Now!`,
        },
        data: {
          type: 'expert_online',
          eventId: event.id,
          sentAt: String(Date.now()),
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
