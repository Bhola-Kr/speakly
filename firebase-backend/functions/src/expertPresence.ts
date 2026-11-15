import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onValueWritten } from 'firebase-functions/v2/database';

const DATA_ROOT = 'speakly';
const WAITING_ROOM_STATUS = 'waiting';
const CALL_IN_PROGRESS_STATUSES = new Set([
  'calling',
  'ringing',
  'accepted',
  'active',
]);
const VALID_ROOM_STATUSES = new Set([
  WAITING_ROOM_STATUS,
  ...CALL_IN_PROGRESS_STATUSES,
  'rejected',
  'men_rejected',
  'ended',
]);

async function reconcileExpertPresence(uid: string) {
  if (!uid) return;

  const database = admin.database();
  const [userSnapshot, roomSnapshot, presenceSnapshot] = await Promise.all([
    database.ref(`${DATA_ROOT}/users/${uid}`).once('value'),
    database.ref(`${DATA_ROOT}/rooms/${uid}`).once('value'),
    database.ref(`${DATA_ROOT}/expertPresence/${uid}`).once('value'),
  ]);
  const user = userSnapshot.val();
  const room = roomSnapshot.val();
  const presence = presenceSnapshot.val() || {};
  if (!user || (user.isExpert !== true && user.profile?.role !== 'expert')) {
    return;
  }

  const roomStatus = String(room?.status || '');
  let hasLiveConnection = false;
  for (const connection of Object.values(presence.connections || {}) as any[]) {
    if (Number(connection?.connectedAt) > 0) {
      hasLiveConnection = true;
      break;
    }
  }
  const appInBackground = presence.appState === 'background';
  const canReceiveCalls =
    user.settings?.voiceCallsEnabled === true &&
    (hasLiveConnection || appInBackground) &&
    room?.female?.uid === uid &&
    VALID_ROOM_STATUSES.has(roomStatus);

  let expectedStatus = 'offline';
  if (canReceiveCalls) {
    expectedStatus = CALL_IN_PROGRESS_STATUSES.has(roomStatus)
      ? 'busy'
      : 'online';
  }

  const currentStatus = user.profile?.status;
  if (
    !hasLiveConnection &&
    !appInBackground &&
    room &&
    roomStatus === 'waiting'
  ) {
    await database
      .ref(`${DATA_ROOT}/rooms/${uid}`)
      .transaction((current: any) => {
        if (
          !current ||
          current.status !== 'waiting'
        ) {
          return;
        }
        return { ...current, status: 'offline', updatedAt: Date.now() };
      });
  }

  if (currentStatus === expectedStatus) return;

  await database
    .ref(`${DATA_ROOT}/users/${uid}/profile/status`)
    .set(expectedStatus);
  logger.info('Reconciled expert availability status', {
    uid,
    previousStatus: currentStatus || null,
    status: expectedStatus,
    roomStatus: roomStatus || null,
    voiceCallsEnabled: user.settings?.voiceCallsEnabled === true,
    hasLiveConnection,
    appInBackground,
  });
}

export const reconcileExpertPresenceOnRoomChange = onValueWritten(
  '/speakly/rooms/{uid}',
  async event => reconcileExpertPresence(String(event.params.uid || '')),
);

export const reconcileExpertPresenceOnStatusChange = onValueWritten(
  '/speakly/users/{uid}/profile/status',
  async event => reconcileExpertPresence(String(event.params.uid || '')),
);

export const reconcileExpertPresenceOnAvailabilityChange = onValueWritten(
  '/speakly/users/{uid}/settings/voiceCallsEnabled',
  async event => reconcileExpertPresence(String(event.params.uid || '')),
);

export const reconcileExpertPresenceOnConnectionChange = onValueWritten(
  '/speakly/expertPresence/{uid}',
  async event => reconcileExpertPresence(String(event.params.uid || '')),
);

