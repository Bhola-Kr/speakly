import * as admin from 'firebase-admin';
import { onValueWritten, onValueCreated } from 'firebase-functions/v2/database';
import { creditExpertEarningsForCall } from './expertCompensation';

export const settleRecordedCall = onValueCreated(
  { ref: '/speakly/callHistory/{uid}/{callId}', retry: true },
  async event => {
    const history = event.data.val();
    if (
      history?.maleInfo?.uid !== event.params.uid ||
      history?.status !== 'Completed'
    )
      return;
    await creditExpertEarningsForCall(event.params.callId, history);
  },
);

export const recordUnansweredCall = onValueWritten(
  '/speakly/rooms/{hostUid}',
  async event => {
    const room = event.data.after.val();
    const before = event.data.before.val();
    if (
      !room?.currentCallId ||
      !room.male?.uid ||
      room.callStartedAt ||
      !['rejected', 'men_rejected'].includes(room.status) ||
      before?.status === room.status
    )
      return;
    const history = {
      callId: room.currentCallId,
      startedAt: room.callRequestedAt || room.updatedAt,
      endedAt: room.updatedAt,
      duration: 0,
      amount: 0,
      callRatePerMinute: room.callRatePerMinute,
      status: 'Missed',
      maleInfo: room.male,
      femaleInfo: room.female,
    };
    for (const uid of [room.male.uid, room.female.uid]) {
      await admin
        .database()
        .ref(`speakly/callHistory/${uid}/${room.currentCallId}`)
        .transaction(current => current || history);
    }
  },
);
