import auth from '@react-native-firebase/auth';
import { NativeEventEmitter, Platform } from 'react-native';
import PayUBizSdk from 'payu-non-seam-less-react';

import { API_BASE_URL, PaymentTransaction } from '../api/api';
import {
  confirmWalletPayment,
  initiateWalletPayment,
  verifyWalletPayment,
} from '../api/calls';

type HashEvent = {
  hashString?: string;
  hashName?: string;
  postSalt?: string;
};

type PaymentSuccessEvent = {
  payuResponse?: unknown;
  merchantResponse?: unknown;
};

const FINAL_STATUSES = new Set(['success', 'failed']);
const PAYMENT_VERIFICATION_ATTEMPTS = 4;
const PAYMENT_VERIFICATION_DELAY_MS = 400;

const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const continueVerificationInBackground = async (transactionId: string) => {
  for (let attempt = 0; attempt < 8; attempt++) {
    await wait(1000);
    try {
      const result = await verifyWalletPayment(transactionId);
      if (FINAL_STATUSES.has(result.data.status)) return;
    } catch {
      // The PayU webhook and scheduled reconciliation remain as fallbacks.
    }
  }
};

export const openPayUCheckout = async (
  packId: number,
): Promise<PaymentTransaction> => {
  if (!PayUBizSdk?.openCheckoutScreen) {
    throw new Error(`PayU checkout is unavailable on ${Platform.OS}.`);
  }

  const initiation = await initiateWalletPayment(packId);
  const { paymentParams, transaction } = initiation.data;
  const token = await auth().currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in again to continue.');

  return new Promise((resolve, reject) => {
    const emitter = new NativeEventEmitter(PayUBizSdk as any);
    let settled = false;
    const subscriptions: Array<{ remove: () => void }> = [];
    const cleanup = () => subscriptions.forEach(item => item.remove());

    const verifyUntilFinal = async () => {
      let payment = transaction;
      let lastError: unknown;

      for (
        let attempt = 0;
        attempt < PAYMENT_VERIFICATION_ATTEMPTS;
        attempt++
      ) {
        try {
          const result = await verifyWalletPayment(transaction.transactionId);
          payment = result.data;
          lastError = undefined;

          if (FINAL_STATUSES.has(payment.status)) return payment;
        } catch (error) {
          lastError = error;
        }
        if (attempt < PAYMENT_VERIFICATION_ATTEMPTS - 1) {
          await wait(PAYMENT_VERIFICATION_DELAY_MS);
        }
      }

      if (lastError && payment.status === 'initiated') throw lastError;
      if (!FINAL_STATUSES.has(payment.status)) {
        continueVerificationInBackground(transaction.transactionId).catch(
          () => undefined,
        );
      }
      return payment;
    };

    const finishSuccessfulPayment = async (event?: PaymentSuccessEvent) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        if (event?.payuResponse) {
          try {
            const confirmed = await confirmWalletPayment(
              transaction.transactionId,
              event.payuResponse,
            );
            if (FINAL_STATUSES.has(confirmed.data.status)) {
              resolve(confirmed.data);
              return;
            }
          } catch {
            // Verify API polling below remains the fallback if the SDK payload
            // is missing, malformed, or has not reached PayU yet.
          }
        }
        resolve(await verifyUntilFinal());
      } catch (error) {
        reject(error);
      }
    };

    const finishUnsuccessfulPayment = async () => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        const result = await verifyWalletPayment(transaction.transactionId);
        if (result.data.status === 'success') {
          resolve(result.data);
          return;
        }
        reject(
          new Error(
            result.data.failureReason || 'The payment was not completed.',
          ),
        );
      } catch (error) {
        reject(error);
      }
    };

    subscriptions.push(
      emitter.addListener('generateHash', async (event: HashEvent) => {
        try {
          if (!event.hashString || !event.hashName) {
            throw new Error('PayU requested an invalid payment hash.');
          }
          const response = await PayUBizSdk.makeHttpRequest(
            `${API_BASE_URL}/payments/hash`,
            'POST',
            JSON.stringify({
              transactionId: transaction.transactionId,
              hashString: event.hashString,
              postSalt: event.postSalt || '',
            }),
            {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          );
          const parsed =
            typeof response === 'string' ? JSON.parse(response) : response;
          const hash = String((parsed as any)?.hash || '');
          if (!hash) {
            const message = String(
              (parsed as any)?.message ||
                (parsed as any)?.error ||
                'Payment hash was not returned by the server.',
            );
            console.error('PayU hash response did not contain a hash', parsed);
            throw new Error(message);
          }
          PayUBizSdk.hashGenerated({ [event.hashName]: hash });
        } catch (error) {
          if (!settled) {
            settled = true;
            cleanup();
            reject(error);
          }
        }
      }),
      emitter.addListener('onPaymentSuccess', finishSuccessfulPayment),
      emitter.addListener('onPaymentFailure', finishUnsuccessfulPayment),
      emitter.addListener('onPaymentCancel', finishUnsuccessfulPayment),
      emitter.addListener('onError', finishUnsuccessfulPayment),
    );

    try {
      PayUBizSdk.openCheckoutScreen({
        payUPaymentParams: paymentParams,
        payUCheckoutProConfig: {
          primaryColor: '#7157F5',
          secondaryColor: '#25204A',
          merchantName: 'Speakly',
          showExitConfirmationOnCheckoutScreen: true,
          showExitConfirmationOnPaymentScreen: true,
        },
      });
    } catch (error) {
      settled = true;
      cleanup();
      reject(error);
    }
  });
};
