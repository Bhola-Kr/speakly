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
  } catch (error: any) {
    try {
      const payment = await verifyUntilSettled(transaction);
      if (payment.status === 'success') return payment;
    } catch {
      // Preserve the checkout error when server verification is unavailable.
    }
    const description = String(
      error?.description || error?.error?.description || error?.message || '',
    );
    throw new Error(description || 'The payment was not completed.');
  }
};
