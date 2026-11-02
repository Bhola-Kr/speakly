import { databaseRef } from './firebase';

export type PaymentGateway = 'payu' | 'razorpay';

const LEGACY_DEFAULT_GATEWAYS: PaymentGateway[] = ['razorpay'];

const parseActivePaymentGateways = (value: unknown): PaymentGateway[] => {
  if (value === null || typeof value === 'undefined') {
    return LEGACY_DEFAULT_GATEWAYS;
  }
  if (typeof value !== 'object' || Array.isArray(value)) return [];

  const config = value as Record<string, unknown>;
  return (['payu', 'razorpay'] as const).filter(
    gateway => config[gateway] === true,
  );
};

export const getActivePaymentGateways = async (): Promise<PaymentGateway[]> => {
  const snapshot = await databaseRef('configs/activePaymentGateways').once(
    'value',
  );
  return parseActivePaymentGateways(snapshot.val());
};

export const listenActivePaymentGateways = (
  callback: (gateways: PaymentGateway[]) => void,
  onError: (error: Error) => void,
) => {
  const ref = databaseRef('configs/activePaymentGateways');
  const listener = ref.on(
    'value',
    snapshot => callback(parseActivePaymentGateways(snapshot.val())),
    error => onError(error),
  );
  return () => ref.off('value', listener);
};
