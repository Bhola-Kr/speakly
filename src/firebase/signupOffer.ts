import auth from '@react-native-firebase/auth';
import { databaseRef } from './firebase';

export type SignupOfferConfig = {
  active: boolean;
  amount: number;
  freeMinutes: number;
};

export const DEFAULT_FIRST_CALL_FREE_MINUTES = 2;
export const SIGNUP_OFFER_AMOUNT = 10;
export const SIGNUP_OFFER_CONFIG_PATH = 'configs/signupOffer';

export const DEFAULT_SIGNUP_OFFER_CONFIG: SignupOfferConfig = {
  active: true,
  amount: SIGNUP_OFFER_AMOUNT,
  freeMinutes: DEFAULT_FIRST_CALL_FREE_MINUTES,
};

const isConfigRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseConfig = (value: unknown): SignupOfferConfig => {
  if (value == null) return DEFAULT_SIGNUP_OFFER_CONFIG;

  const config = isConfigRecord(value) ? value : {};
  const amount =
    typeof config.amount === 'number' &&
    Number.isFinite(config.amount) &&
    config.amount >= 0
      ? config.amount
      : DEFAULT_SIGNUP_OFFER_CONFIG.amount;
  const freeMinutes =
    typeof config.freeMinutes === 'number' &&
    Number.isFinite(config.freeMinutes) &&
    config.freeMinutes > 0
      ? config.freeMinutes
      : DEFAULT_SIGNUP_OFFER_CONFIG.freeMinutes;

  return {
    active:
      config.active === undefined
        ? DEFAULT_SIGNUP_OFFER_CONFIG.active
        : config.active === true,
    amount,
    freeMinutes,
  };
};

export const getSignupOfferConfig = async (): Promise<SignupOfferConfig> => {
  const snapshot = await databaseRef(SIGNUP_OFFER_CONFIG_PATH).once('value');
  return parseConfig(snapshot.val());
};

export const listenSignupOffer = (
  callback: (config: SignupOfferConfig) => void,
) => {
  const ref = databaseRef(SIGNUP_OFFER_CONFIG_PATH);
  const listener = ref.on(
    'value',
    snapshot => callback(parseConfig(snapshot.val())),
    error => {
      console.warn('Unable to load signup offer:', error);
      callback({ ...DEFAULT_SIGNUP_OFFER_CONFIG, active: false });
    },
  );
  return () => ref.off('value', listener);
};

export const claimSignupOffer = async (): Promise<number> => {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Please sign in again to claim this offer.');

  // Always read the latest config at claim time. A disabled or malformed offer
  // is never credited even if an older modal was already visible.
  const config = await getSignupOfferConfig();
  if (!config.active || config.amount <= 0) {
    throw new Error('This offer is no longer available.');
  }

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
