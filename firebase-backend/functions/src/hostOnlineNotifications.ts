import { notificationAudience } from './pushTokenOwnership';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onValueWritten } from 'firebase-functions/v2/database';

const DATA_ROOT = 'speakly';
const EXPERT_STATUS_PATH = '/speakly/users/{hostUid}/profile/status';
const GENERAL_NOTIFICATION_CHANNEL_ID = 'voicetamil_general';

export const notifyAllUsersWhenExpertOnline = onValueWritten(
  { ref: EXPERT_STATUS_PATH, retry: true },
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
    if (
      !host ||
      host.isExpert !== true ||
      host.profile?.status !== 'online' ||
      host.settings?.voiceCallsEnabled === false
    ) {
      return;
    }

    const hostName = String(
      host.profile?.name || host.profile?.tamilName || 'A host',
    ).trim();
    const users = usersSnapshot.val() || {};
    const isFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    let localRecipientUids: string[] = [];
    let tokenList: string[] = [];

    if (isFunctionsEmulator) {
      // Local app builds receive these alerts through the RTDB listener. They
      // often have no FCM token yet (for example, the local admin test account
      // has not completed customer onboarding), so don't apply production
      // token/profile eligibility rules in the emulator.
      localRecipientUids = Object.entries(users)
        .filter(([uid, user]: [string, any]) =>
          uid !== hostUid &&
          !!user &&
          user.accountDeletion?.status !== true &&
          user.isExpert !== true &&
          user.profile?.role !== 'expert' &&
          user.settings?.notificationsEnabled !== false &&
          user.settings?.notification !== false,
        )
        .map(([uid]) => uid);
      if (localRecipientUids.length === 0) {
        logger.info('No eligible app users for local host-online alerts', {
          hostUid,
        });
        return;
      }
    } else {
      const registrations = await database
        .ref(`${DATA_ROOT}/pushTokenOwners`)
        .once('value');
      tokenList = notificationAudience(users, registrations.val(), 'user');
      if (tokenList.length === 0) {
        logger.info('No customer devices are registered for host-online alerts', {
          hostUid,
        });
        return;
      }
    }

    const eventRef = database.ref(
      `${DATA_ROOT}/hostOnlineNotificationEvents/${event.id}`,
    );
    const claim = await eventRef.transaction(current => {
      if (current) return;
      return { hostUid, claimedAt: Date.now() };
    });
    if (!claim.committed) return;

    try {
      if (isFunctionsEmulator) {
        const eventKey = String(event.id).replace(/[^A-Za-z0-9_-]/g, '_');
        const sentAt = Date.now();
        const alertWrites: Record<string, unknown> = {};
        for (const uid of localRecipientUids) {
          alertWrites[
            `${DATA_ROOT}/availabilityAlerts/${uid}/${hostUid}_${eventKey}`
          ] = { hostUid, hostName, sentAt, eventId: event.id };
        }
        await database.ref().update(alertWrites);
        logger.info('Expert online alerts queued for local app devices', {
          hostUid,
          recipients: localRecipientUids.length,
        });
        return;
      }

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
    } catch (error) {
      await eventRef.remove();
      logger.error('Expert online notification delivery failed', {
        hostUid,
        eventId: event.id,
        error,
      });
      throw error;
    }
  },
);
