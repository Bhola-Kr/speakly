import Api from '../api/api';
import auth from '@react-native-firebase/auth';
import { scopedDatabase as database } from './firebase';

export const DEFAULT_MIN_EXPERT_WITHDRAWAL_AMOUNT = 99;

const parseMinimumWithdrawalAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? amount
    : DEFAULT_MIN_EXPERT_WITHDRAWAL_AMOUNT;
};

export const getMinimumWithdrawalAmount = async () => {
  try {
    const snapshot = await database()
      .ref('configs/minimumWithdrawalAmount')
      .once('value');
    return parseMinimumWithdrawalAmount(snapshot.val());
  } catch (error) {
    console.warn('Unable to read minimum withdrawal amount:', error);
    return DEFAULT_MIN_EXPERT_WITHDRAWAL_AMOUNT;
  }
};

export const listenMinimumWithdrawalAmount = (
  callback: (amount: number) => void,
) => {
  const ref = database().ref('configs/minimumWithdrawalAmount');
  const listener = ref.on(
    'value',
    snapshot => callback(parseMinimumWithdrawalAmount(snapshot.val())),
    error => {
      console.warn('Unable to load minimum withdrawal amount:', error);
      callback(DEFAULT_MIN_EXPERT_WITHDRAWAL_AMOUNT);
    },
  );
  return () => ref.off('value', listener);
};

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
  const response = await Api.post<{
    success: boolean;
    request: WithdrawalRequest;
  }>('/requestExpertWithdrawal');
  return response.request;
};

export const processWithdrawalRequest = async (
  request: WithdrawalRequest,
  decision: 'paid' | 'rejected',
) => {
  const adminUid = auth().currentUser?.uid;
  if (!adminUid) throw new Error('Dobara sign in karo.');
  const adminSnapshot = await database()
    .ref(`users/${adminUid}/isAdmin`)
    .once('value');
  if (adminSnapshot.val() !== true)
    throw new Error('Admin access zaroori hai.');
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
  if (!claimed.committed)
    throw new Error('Yeh request pehle hi process ho chuki hai.');

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
