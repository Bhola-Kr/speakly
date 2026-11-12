import auth from '@react-native-firebase/auth';

import type { CallHistory } from './RoomService';
import { databaseRef } from './firebase';

const MINIMUM_VALUE_CALL_DURATION_MS = 30 * 1000;

export const getFirstValueCall = (history: CallHistory[]) => {
  const completedCalls = history
    .filter(
      call =>
        call.status === 'Completed' &&
        Number(call.duration || 0) >= MINIMUM_VALUE_CALL_DURATION_MS,
    )
    .sort((a, b) => Number(a.startedAt || 0) - Number(b.startedAt || 0));

  return completedCalls.length === 1 ? completedCalls[0] : null;
};

export async function claimFirstCallRechargePrompt(
  uid: string,
  history: CallHistory[],
): Promise<CallHistory | null> {
  if (auth().currentUser?.uid !== uid) return null;

  const firstCall = getFirstValueCall(history);
  if (!firstCall) return null;

  const result = await databaseRef(
    `users/${uid}/conversionPrompts/firstCallRecharge`,
  ).transaction(
    current => {
      if (current?.promptedAt) return;
      return {
        promptedAt: Date.now(),
        callId: firstCall.callId || '',
      };
    },
    undefined,
    false,
  );

  return result.committed ? firstCall : null;
}
