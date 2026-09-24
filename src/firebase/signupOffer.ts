import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';

export type SignupOfferConfig = {
  active: boolean;
  amount: number;
};

const parseConfig = (value: any): SignupOfferConfig => {
  const amount = Number(value?.offerdAmount);
  return {
    active: value?.isActiveOffer === true,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
  };
};

export const listenSignupOffer = (
  callback: (config: SignupOfferConfig) => void,
) => {
  const ref = database().ref('configs');
  const listener = ref.on(
    'value',
    snapshot => callback(parseConfig(snapshot.val())),
    error => {
      console.warn('Unable to load signup offer:', error);
      callback({ active: false, amount: 0 });
    },
  );
  return () => ref.off('value', listener);
};

export const claimSignupOffer = async (): Promise<number> => {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Please sign in again to claim this offer.');

  // Always read the latest config at claim time. A disabled or malformed offer
  // is never credited even if an older modal was already visible.
  const configSnapshot = await database().ref('configs').once('value');
  const config = parseConfig(configSnapshot.val());
  if (!config.active || config.amount <= 0) {
    throw new Error('This offer is no longer available.');
  }

  const userRef = database().ref(`users/${uid}`);
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
    if (userValue?.profile?.gender !== 'male') return;
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
    throw new Error('This offer is available only to male users.');
  }

  return config.amount;
};
