import auth from '@react-native-firebase/auth';
import { NativeEventEmitter, Platform } from 'react-native';
import PayUBizSdk from 'payu-non-seam-less-react';

import { API_BASE_URL, PaymentTransaction } from '../api/api';
import { initiateWalletPayment, verifyWalletPayment } from '../api/calls';

type HashEvent = {
  hashString?: string;
  hashName?: string;
  postSalt?: string;
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

    const finish = async () => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        const result = await verifyWalletPayment(transaction.transactionId);
        resolve(result.data);
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
          if (!hash) throw new Error('Payment hash was not returned.');
          PayUBizSdk.hashGenerated({ [event.hashName]: hash });
        } catch (error) {
          if (!settled) {
            settled = true;
            cleanup();
            reject(error);
          }
        }
      }),
      emitter.addListener('onPaymentSuccess', finish),
      emitter.addListener('onPaymentFailure', finish),
      emitter.addListener('onPaymentCancel', finish),
      emitter.addListener('onError', finish),
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
