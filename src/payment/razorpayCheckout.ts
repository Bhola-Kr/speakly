import RazorpayCheckout from 'react-native-razorpay';

import type { PaymentTransaction, RazorpayCheckoutResponse } from '../api/api';
import {
  confirmRazorpayWalletPayment,
  initiateRazorpayWalletPayment,
  verifyWalletPayment,
} from '../api/calls';

const FINAL_STATUSES = new Set(['success', 'failed']);
const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const verifyUntilSettled = async (
  initial: PaymentTransaction,
): Promise<PaymentTransaction> => {
  let payment = initial;
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await verifyWalletPayment(initial.transactionId);
    payment = result.data;
    if (FINAL_STATUSES.has(payment.status)) return payment;
    if (attempt < 4) await wait(500);
  }
  return payment;
};

export const openRazorpayCheckout = async (
  packId: number,
): Promise<PaymentTransaction> => {
  const initiation = await initiateRazorpayWalletPayment(packId);
  const { transaction, checkoutOptions } = initiation.data;
  try {
    const response = (await RazorpayCheckout.open(
      checkoutOptions,
    )) as RazorpayCheckoutResponse;
    const confirmation = await confirmRazorpayWalletPayment(
      transaction.transactionId,
      response,
    );
    if (FINAL_STATUSES.has(confirmation.data.status)) {
      return confirmation.data;
    }
    return verifyUntilSettled(confirmation.data);
  } catch {
    let payment: PaymentTransaction | null = null;
    try {
      payment = await verifyUntilSettled(transaction);
      if (payment.status === 'success') return payment;
    } catch {
      // Fall through to a user-facing message if verification is unavailable.
    }
    if (payment?.status === 'failed') {
      throw new Error(
        payment.failureReason ||
          'Payment failed. No amount was added to your wallet.',
      );
    }
    throw new Error(
      'Payment was cancelled or could not be completed. If money was deducted, Razorpay will verify it and your wallet will be updated automatically.',
    );
  }
};
