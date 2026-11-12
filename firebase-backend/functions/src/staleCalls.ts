import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { creditExpertEarningsForCall } from './expertCompensation.js';

const DATA_ROOT = 'speakly';
const STALE_CALL_GRACE_MS = 75 * 1000;

const normalizeRate = (value: unknown) => {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : 5;
};

export const cleanupStaleCalls = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'Asia/Kolkata',
    timeoutSeconds: 120,
  },
  async () => {
    const now = Date.now();
    const roomsSnapshot = await admin
      .database()
      .ref(`${DATA_ROOT}/rooms`)
      .once('value');

    const roomsToProcess = Object.entries(roomsSnapshot.val() || {}).filter(
      ([, room]: [string, any]) =>
        room?.status === 'active' ||
        (room?.status === 'ended' && room?.callSettled === false),
    );

    for (const [expertUid, value] of roomsToProcess) {
      const room: any = value;
      const callId = String(room.currentCallId || '');
      const callerUid = String(room.male?.uid || '');
      if (!callId || !callerUid) continue;

      let endedRoom: any = room;
      let endedAt = Number(room.updatedAt || now);
      const roomRef = admin.database().ref(`${DATA_ROOT}/rooms/${expertUid}`);
      if (room.status === 'active') {
        const startedAt = Number(room.callStartedAt || room.updatedAt || 0);
        if (!startedAt || now - startedAt <= STALE_CALL_GRACE_MS) {
          continue;
        }

        const [callerPresence, expertPresence] = await Promise.all([
          admin
            .database()
            .ref(`${DATA_ROOT}/callPresence/${callId}/${callerUid}`)
            .once('value'),
          admin
            .database()
            .ref(`${DATA_ROOT}/callPresence/${callId}/${expertUid}`)
            .once('value'),
        ]);
        if (callerPresence.val() === true && expertPresence.val() === true) {
          continue;
        }

        endedAt = Date.now();
        const endedTransaction = await roomRef.transaction((current: any) => {
          if (
            !current ||
            current.status !== 'active' ||
            current.currentCallId !== callId
          ) {
            return;
          }
          return {
            ...current,
            status: 'ended',
            callSettled: false,
            updatedAt: endedAt,
          };
        });
        if (!endedTransaction.committed) continue;
        endedRoom = endedTransaction.snapshot.val();
      }

      const rate = normalizeRate(endedRoom.callRatePerMinute);
      const recordedAmount = Number(endedRoom.chargedAmount || 0);
      const amount = Number.isFinite(recordedAmount)
        ? Math.floor(Math.max(0, recordedAmount) / rate) * rate
        : 0;
      const duration = (amount / rate) * 60 * 1000;
      const history = {
        callId,
        startedAt: Number(endedRoom.callStartedAt || endedRoom.callRequestedAt || endedAt),
        endedAt,
        duration,
        amount,
        callRatePerMinute: rate,
        status: amount > 0 ? 'Completed' : 'Missed',
        maleInfo: endedRoom.male,
        femaleInfo: endedRoom.female,
      };

      try {
        await admin.database().ref().update({
          [`${DATA_ROOT}/callHistory/${callerUid}/${callId}`]: history,
          [`${DATA_ROOT}/callHistory/${expertUid}/${callId}`]: history,
        });
        await creditExpertEarningsForCall(callId, history);
        await roomRef.transaction((current: any) => {
          if (
            !current ||
            current.status !== 'ended' ||
            current.currentCallId !== callId
          ) {
            return;
          }
          return {
            ...current,
            status: 'waiting',
            currentCallId: '',
            male: null,
            callStartedAt: null,
            chargedAmount: null,
            callSettled: null,
            updatedAt: Date.now(),
          };
        });
        await admin.database().ref(`${DATA_ROOT}/users/${expertUid}/profile/status`).set('online');
        await admin.database().ref(`${DATA_ROOT}/callPresence/${callId}`).remove();
      } catch (error) {
        logger.error('Unable to finalize stale call', { callId, error });
      }
    }
  },
);
