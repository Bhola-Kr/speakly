import * as admin from 'firebase-admin';
import { onValueWritten } from 'firebase-functions/v2/database';
import { runDataTransaction } from './databaseTransaction';
import { tokensForUser } from './pushTokenOwnership';
import { logger } from 'firebase-functions';

export async function notifyInterestedCustomers(hostUid: string) {
  const now = Date.now();
  const claim = await runDataTransaction(
    admin.database().ref('speakly'),
    data => {
      const host = data?.users?.[hostUid];
      const room = data?.rooms?.[hostUid];
      if (
        host?.isExpert !== true ||
        host.profile?.status !== 'online' ||
        host.settings?.voiceCallsEnabled === false ||
        !['waiting', 'ended', 'rejected', 'men_rejected'].includes(room?.status)
      )
        return;
      const watchers = data.hostAvailabilityWatchers?.[hostUid];
      if (!watchers) return;
      for (const [uid, value] of Object.entries(watchers) as [string, any][]) {
        const user = data.users?.[uid];
        const blocked =
          (data.blocks?.[uid]?.[hostUid]?.isActive !== false &&
            data.blocks?.[uid]?.[hostUid]) ||
          (data.blocks?.[hostUid]?.[uid]?.isActive !== false &&
            data.blocks?.[hostUid]?.[uid]);
        if (
          !user ||
          user.isExpert === true ||
          blocked ||
          user.settings?.notificationsEnabled === false ||
          user.settings?.notification === false ||
          now - value.createdAt > 86400000
        )
          continue;
        data.availabilityAlerts ||= {};
        data.availabilityAlerts[uid] ||= {};
        // One outstanding alert per host; consuming watchers prevents heartbeat repeats.
        data.availabilityAlerts[uid][hostUid] = {
          hostUid,
          hostName: host.profile.name || 'Expert',
          sentAt: now,
        };
      }
      delete data.hostAvailabilityWatchers[hostUid];
      return data;
    },
  );
  if (!claim.committed) return;
  const alerts = claim.snapshot.child('availabilityAlerts').val() || {};
  for (const [uid, byHost] of Object.entries(alerts) as [string, any][]) {
    const alert = byHost[hostUid];
    if (alert?.sentAt !== now) continue;
    const tokens = await tokensForUser(uid);
    if (!tokens.length || process.env.FUNCTIONS_EMULATOR === 'true') continue;
    for (let offset = 0; offset < tokens.length; offset += 500) {
      await admin
        .messaging()
        .sendEachForMulticast({
          tokens: tokens.slice(offset, offset + 500),
          notification: {
            title: `${alert.hostName} is available again! 🎉`,
            body: `${alert.hostName} is free now. Connect now!`,
          },
          data: {
            type: 'expert_online',
            hostUid,
            hostName: alert.hostName,
            sentAt: String(now),
            eventId: `available_${hostUid}_${now}`,
          },
          android: {
            priority: 'high',
            notification: { channelId: 'voicetamil_general', sound: 'default' },
          },
          apns: { payload: { aps: { sound: 'default' } } },
        })
        .catch(error =>
          logger.error('Availability push failed', { hostUid, error }),
        );
    }
  }
}
export const notifyInterestedWhenRoomAvailable = onValueWritten(
  '/speakly/rooms/{hostUid}/status',
  event => notifyInterestedCustomers(event.params.hostUid),
);
export const notifyInterestedWhenHostOnline = onValueWritten(
  '/speakly/users/{hostUid}/profile/status',
  event => notifyInterestedCustomers(event.params.hostUid),
);
