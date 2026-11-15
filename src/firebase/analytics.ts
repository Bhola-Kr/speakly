import {
  getAnalytics,
  logEvent,
  logLogin,
  logPurchase,
  logScreenView,
  setUserId,
  setUserProperty,
} from '@react-native-firebase/analytics';
import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';

import type { PaymentTransaction } from '../api/api';

// Replace these with the App ID and Client Token from Meta for Developers.
// They are public app configuration values, not server access tokens.
const META_APP_ID = '1674665194000370';
const META_CLIENT_TOKEN = 'f09e92fb305d81235d9389e4cae9655c';
const META_APP_NAME = 'Speakly 121';
let metaReady = false;

export const initializeMetaAppEvents = () => {
  if (
    META_APP_ID === '1674665194000370' ||
    META_CLIENT_TOKEN === 'f09e92fb305d81235d9389e4cae9655c' ||
    metaReady
  ) {
    return;
  }

  try {
    Settings.setAppID(META_APP_ID);
    Settings.setClientToken(META_CLIENT_TOKEN);
    Settings.setAppName(META_APP_NAME);
    Settings.setAutoLogAppEventsEnabled(true);
    Settings.initializeSDK();
    metaReady = true;
  } catch (error) {
    if (__DEV__) console.warn('Meta App Events initialization failed:', error);
  }
};

const trackMetaEvent = (
  eventName: string,
  parameters?: Record<string, string | number>,
  valueToSum?: number,
) => {
  initializeMetaAppEvents();
  if (!metaReady) return;
  try {
    if (valueToSum === undefined) {
      AppEventsLogger.logEvent(eventName, parameters || {});
    } else {
      AppEventsLogger.logEvent(eventName, valueToSum, parameters || {});
    }
  } catch (error) {
    if (__DEV__) console.warn('Meta App Event failed:', error);
  }
};

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

export const trackLoginSuccess = (
  uid: string,
  isExpert: boolean,
  isNewUser = false,
) =>
  safelyTrack(async () => {
    const analytics = getAnalytics();
    await setUserId(analytics, uid);
    await setUserProperty(
      analytics,
      'user_role',
      isExpert ? 'expert' : 'caller',
    );
    await logLogin(analytics, { method: 'phone_otp' });
    trackMetaEvent('Login', {
      method: 'phone_otp',
      user_role: isExpert ? 'expert' : 'caller',
    });
    if (isNewUser) {
      await logEvent(analytics, 'sign_up', { method: 'phone_otp' });
      trackMetaEvent(AppEventsLogger.AppEvents.CompletedRegistration, {
        [AppEventsLogger.AppEventParams.RegistrationMethod]: 'phone_otp',
      });
    }
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
    trackMetaEvent('Login', {
      method,
      user_role: isExpert ? 'expert' : 'caller',
    });
    if (isNewUser) {
      await logEvent(analytics, 'sign_up', { method });
      trackMetaEvent(AppEventsLogger.AppEvents.CompletedRegistration, {
        [AppEventsLogger.AppEventParams.RegistrationMethod]: method,
      });
    }
  });

export const trackLoginModalEvent = (
  eventName:
    | 'LoginModalOpened'
    | 'LoginModalDismissed'
    | 'LoginMethodSelected'
    | 'LoginOtpRequested'
    | 'LoginOtpRequestFailed'
    | 'LoginOtpVerificationFailed'
    | 'LoginGoogleFailed',
  parameters: Record<string, string | number> = {},
) =>
  safelyTrack(async () => {
    trackMetaEvent(eventName, parameters);
    await logEvent(getAnalytics(), eventName.toLowerCase(), parameters);
  });

export const trackCallLifecycle = (
  eventName:
    | 'OutgoingCallAttempted'
    | 'OutgoingCallRinging'
    | 'OutgoingCallCancelled'
    | 'OutgoingCallRejected'
    | 'OutgoingCallTimedOut'
    | 'IncomingCallAccepted'
    | 'IncomingCallDeclined'
    | 'CallEnded'
    | 'CallConnectionLost'
    | 'CallReconnected',
  parameters: Record<string, string | number> = {},
) =>
  safelyTrack(async () => {
    trackMetaEvent(eventName, parameters);
    await logEvent(getAnalytics(), eventName.toLowerCase(), parameters);
  });

export const trackCallConnected = (
  role: 'caller' | 'expert',
  ratePerMinute: number,
  durationSeconds?: number,
) =>
  safelyTrack(async () => {
    trackMetaEvent('CallConnected', {
      user_role: role,
      rate_per_minute: ratePerMinute,
    }, ratePerMinute);
    await logEvent(getAnalytics(), 'call_connected', {
      user_role: role,
      rate_per_minute: ratePerMinute,
    });
  });

export const trackCallEnded = (
  role: 'caller' | 'expert',
  durationSeconds: number,
  reason: string,
) =>
  safelyTrack(async () => {
    const parameters = {
      user_role: role,
      duration_seconds: Math.max(0, Math.floor(durationSeconds)),
      end_reason: reason,
    };
    trackMetaEvent('CallEnded', parameters, parameters.duration_seconds);
    await logEvent(getAnalytics(), 'call_ended', parameters);
  });

export const trackFirstCallOfferApplied = (coins: number) =>
  safelyTrack(() => {
    trackMetaEvent('FirstCallOfferApplied', { coins_credited: coins }, coins);
    return logEvent(getAnalytics(), 'first_call_offer_applied', {
      free_minutes: 2,
      coins_credited: coins,
    });
  });

export const trackCheckoutStarted = (
  amount: number,
  coins: number,
  gateway?: 'payu' | 'razorpay',
) =>
  safelyTrack(() => {
    trackMetaEvent(AppEventsLogger.AppEvents.InitiatedCheckout, {
      currency: 'INR',
      value: amount,
      coins,
      ...(gateway ? { payment_gateway: gateway } : {}),
    }, amount);
    return logEvent(getAnalytics(), 'begin_checkout', {
      currency: 'INR',
      value: amount,
      coins,
    });
  });

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
    trackMetaEvent('CallStarted', {
      user_role: role,
      rate_per_minute: ratePerMinute,
    }, ratePerMinute);
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

    initializeMetaAppEvents();
    if (metaReady) {
      try {
        AppEventsLogger.logPurchase(payment.amount, payment.currency, {
          transaction_id: payment.transactionId,
          payment_gateway: gateway,
          coins_credited: payment.creditedAmount,
        });
      } catch (error) {
        if (__DEV__) console.warn('Meta purchase event failed:', error);
      }
    }
    await logPurchase(analytics, purchase);
    await logEvent(analytics, 'payment_success', purchase);
  });
