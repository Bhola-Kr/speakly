import {
  getAnalytics,
  logEvent,
  logLogin,
  logPurchase,
  logScreenView,
  setUserId,
  setUserProperty,
} from '@react-native-firebase/analytics';

import type { PaymentTransaction } from '../api/api';

const safelyTrack = (operation: () => Promise<void>) => {
  // Run on a detached promise so analytics initialization and event delivery
  // can never delay a user-facing flow or throw into its caller.
  Promise.resolve()
    .then(operation)
    .catch(error => {
      if (__DEV__) console.warn('Firebase Analytics event failed:', error);
    });
};

export const identifyAnalyticsUser = (uid: string, role: 'caller' | 'expert') =>
  safelyTrack(async () => {
    const analytics = getAnalytics();
    await setUserId(analytics, uid);
    await setUserProperty(analytics, 'user_role', role);
  });

export const trackLoginSuccess = (uid: string, isExpert: boolean) =>
  safelyTrack(async () => {
    const analytics = getAnalytics();
    await setUserId(analytics, uid);
    await setUserProperty(
      analytics,
      'user_role',
      isExpert ? 'expert' : 'caller',
    );
    await logLogin(analytics, { method: 'phone_otp' });
  });

export const trackGuestAuthentication = (
  uid: string,
  isExpert: boolean,
  method: 'phone_otp' | 'google',
  isNewUser: boolean,
) =>
  safelyTrack(async () => {
    const analytics = getAnalytics();
    await setUserId(analytics, uid);
    await setUserProperty(
      analytics,
      'user_role',
      isExpert ? 'expert' : 'caller',
    );
    await logLogin(analytics, { method });
    if (isNewUser) {
      await logEvent(analytics, 'sign_up', { method });
    }
  });

export const trackFirstCallOfferApplied = (coins: number) =>
  safelyTrack(() =>
    logEvent(getAnalytics(), 'first_call_offer_applied', {
      free_minutes: 2,
      coins_credited: coins,
    }),
  );

export const trackCheckoutStarted = (amount: number, coins: number) =>
  safelyTrack(() =>
    logEvent(getAnalytics(), 'begin_checkout', {
      currency: 'INR',
      value: amount,
      coins,
    }),
  );

export const trackScreenView = (screenName: string) =>
  safelyTrack(() => {
    const analytics = getAnalytics();
    return logScreenView(analytics, {
      screen_name: screenName,
      screen_class: screenName,
    });
  });

export const trackCallStarted = (
  role: 'caller' | 'expert',
  ratePerMinute: number,
) =>
  safelyTrack(() => {
    const analytics = getAnalytics();
    return logEvent(analytics, 'call_started', {
      user_role: role,
      rate_per_minute: ratePerMinute,
    });
  });

export const trackPaymentSuccess = (
  payment: PaymentTransaction,
  gateway: 'payu' | 'razorpay',
) =>
  safelyTrack(async () => {
    const analytics = getAnalytics();
    const purchase = {
      transaction_id: payment.transactionId,
      currency: payment.currency,
      value: payment.amount,
      payment_type: gateway,
      coins_credited: payment.creditedAmount,
    };

    await logPurchase(analytics, purchase);
    await logEvent(analytics, 'payment_success', purchase);
  });
