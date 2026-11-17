import Api from '../api/api';
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

const isConfigRecord = (value: unknown): value is Record<string, unknown> =>
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
  const response = await Api.post<{ success: boolean; amount: number }>(
    '/claimSignupOffer',
  );
  return response.amount;
};
