import auth from '@react-native-firebase/auth';
import { scopedDatabase as database } from './firebase';

export const MIN_EXPERT_WITHDRAWAL_AMOUNT = 49;

export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';

export type WithdrawalRequest = {
  id: string;
  expertUid: string;
  expertName: string;
  phone: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: number;
  updatedAt: number;
  processedAt?: number;
  processedBy?: string;
};

export const requestExpertWithdrawal = async () => {
  const currentUser = auth().currentUser;
  if (!currentUser) throw new Error('Please sign in again.');

  const userSnapshot = await database()
    .ref(`users/${currentUser.uid}`)
    .once('value');
  const user = userSnapshot.val() || {};
  if (user.isExpert !== true) throw new Error('Expert access is required.');

  const requestId = database().ref('withdrawalRequests').push().key;
  if (!requestId) throw new Error('Unable to create withdrawal request.');
  const now = Date.now();
  let reservedAmount = 0;
  const earningsRef = database().ref(
    `users/${currentUser.uid}/expertEarnings`,
  );
  const reservation = await earningsRef.transaction(value => {
    const earnings = value && typeof value === 'object' ? value : {};
    if (earnings.pendingWithdrawal?.id) return;
    const available = Number(earnings.available || 0);
    if (
      !Number.isFinite(available) ||
      available < MIN_EXPERT_WITHDRAWAL_AMOUNT
    ) {
      return;
    }
    reservedAmount = available;
    return {
      ...earnings,
      available: 0,
      pendingWithdrawal: { id: requestId, amount: available, requestedAt: now },
      updatedAt: now,
    };
  });
  if (!reservation.committed || reservedAmount <= 0) {
    const available = Number(reservation.snapshot.val()?.available || 0);
    throw new Error(
      reservation.snapshot.val()?.pendingWithdrawal?.id
        ? 'A withdrawal request is already pending.'
        : available > 0 &&
            available < MIN_EXPERT_WITHDRAWAL_AMOUNT
          ? `Minimum withdrawal amount is ₹${MIN_EXPERT_WITHDRAWAL_AMOUNT}.`
          : 'No earnings are available for withdrawal.',
    );
  }

  const request: WithdrawalRequest = {
    id: requestId,
    expertUid: currentUser.uid,
    expertName: String(
      user.profile?.name || user.profile?.tamilName || 'Expert',
    ),
    phone: String(user.phone || user.profile?.phone || ''),
    amount: reservedAmount,
    status: 'pending',
    requestedAt: now,
    updatedAt: now,
  };
  try {
    await database().ref().update({
      [`withdrawalRequests/${requestId}`]: request,
      [`users/${currentUser.uid}/withdrawalRequests/${requestId}`]: request,
    });
  } catch (error) {
    await earningsRef.transaction(value => {
      if (value?.pendingWithdrawal?.id !== requestId) return;
      return {
        ...value,
        available: Number(value.available || 0) + reservedAmount,
        pendingWithdrawal: null,
        updatedAt: Date.now(),
      };
    });
    throw error;
  }
  return request;
};

export const processWithdrawalRequest = async (
  request: WithdrawalRequest,
  decision: 'paid' | 'rejected',
) => {
  const adminUid = auth().currentUser?.uid;
  if (!adminUid) throw new Error('Please sign in again.');
  const adminSnapshot = await database().ref(`users/${adminUid}/isAdmin`).once('value');
  if (adminSnapshot.val() !== true) throw new Error('Admin access is required.');
  const requestRef = database().ref(`withdrawalRequests/${request.id}`);
  const now = Date.now();
  const claimed = await requestRef.transaction(current => {
    if (!current || current.status !== 'pending') return;
    return {
      ...current,
      status: decision,
      processedAt: now,
      processedBy: adminUid,
      updatedAt: now,
    };
  });
  if (!claimed.committed) throw new Error('This request is already processed.');

  const earningsRef = database().ref(
    `users/${request.expertUid}/expertEarnings`,
  );
  await earningsRef.transaction(value => {
    const earnings = value && typeof value === 'object' ? value : {};
    if (earnings.pendingWithdrawal?.id !== request.id) return earnings;
    return {
      ...earnings,
      available:
        decision === 'rejected'
          ? Number(earnings.available || 0) + request.amount
          : Number(earnings.available || 0),
      withdrawn:
        Number(earnings.withdrawn || 0) +
        (decision === 'paid' ? request.amount : 0),
      pendingWithdrawal: null,
      updatedAt: now,
    };
  });
  await database()
    .ref(`users/${request.expertUid}/withdrawalRequests/${request.id}`)
    .set(claimed.snapshot.val());
};
