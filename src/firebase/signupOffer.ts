import auth from '@react-native-firebase/auth';
import { databaseRef } from './firebase';
import { CALL_RATE_PER_MINUTE } from '../constants/constants';

export type SignupOfferConfig = {
  active: boolean;
  amount: number;
};

export const FIRST_CALL_FREE_MINUTES = 2;
export const MINIMUM_FIRST_CALL_CREDIT =
  FIRST_CALL_FREE_MINUTES * CALL_RATE_PER_MINUTE;

const parseConfig = (value: any): SignupOfferConfig => {
  const amount = Number(value?.offerdAmount);
  return {
    // The first-call promise is part of the permanent acquisition experience.
    // Remote config may increase the reward, but cannot reduce it below the
    // two-minute minimum advertised throughout the app.
    active: true,
    amount:
      Number.isFinite(amount) && amount > 0
        ? Math.max(amount, MINIMUM_FIRST_CALL_CREDIT)
        : MINIMUM_FIRST_CALL_CREDIT,
  };
};

export const listenSignupOffer = (
  callback: (config: SignupOfferConfig) => void,
) => {
  const ref = databaseRef('configs');
  const listener = ref.on(
    'value',
    snapshot => callback(parseConfig(snapshot.val())),
    error => {
      console.warn('Unable to load signup offer:', error);
      callback({
        active: true,
        amount: MINIMUM_FIRST_CALL_CREDIT,
      });
    },
  );
  return () => ref.off('value', listener);
};

export const claimSignupOffer = async (): Promise<number> => {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Please sign in again to claim this offer.');

  // Always read the latest config at claim time. A disabled or malformed offer
  // is never credited even if an older modal was already visible.
  const configSnapshot = await databaseRef('configs').once('value');
  const config = parseConfig(configSnapshot.val());
  if (config.amount <= 0)
    throw new Error('Unable to apply the free-call offer.');

  const userRef = databaseRef(`users/${uid}`);
  const initialSnapshot = await userRef.once('value');
  if (!initialSnapshot.exists()) throw new Error('User account was not found.');
  const initialUser = initialSnapshot.val();
  let invocation = 0;

  const result = await userRef.transaction(userValue => {
    const firstInvocation = invocation === 0;
    invocation += 1;
    if (!userValue) {
      if (!firstInvocation) return;
      userValue = { ...initialUser };
    }
    if (userValue?.isExpert === true) return;
    if (userValue?.offers?.signupOffer?.claimedAt) return;

    const currentBalance = Number(userValue?.wallet?.balance);
    const safeBalance = Number.isFinite(currentBalance)
      ? Math.max(0, currentBalance)
      : 0;

    return {
      ...userValue,
      wallet: {
        ...(userValue.wallet || {}),
        balance: safeBalance + config.amount,
      },
      offers: {
        ...(userValue.offers || {}),
        signupOffer: {
          claimedAt: Date.now(),
          amount: config.amount,
        },
      },
    };
  });

  if (!result.committed) {
    const value = result.snapshot.val();
    if (value?.offers?.signupOffer?.claimedAt) {
      throw new Error('This signup offer has already been claimed.');
    }
    throw new Error('This offer is available only to regular users.');
  }

  return config.amount;
};
