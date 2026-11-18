import {
  AppState,
  DeviceEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { FirebaseDatabaseTypes } from '@react-native-firebase/database';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  AuthorizationStatus,
  EventType,
  Event,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import { hasCompletedSignup } from '../utils/profileValidation';
import { scopedDatabase as database } from '../firebase/firebase';
import Api from '../api/api';

const CHANNEL_ID = 'voicetamil_general';
// Android notification-channel sound settings are immutable after creation.
// Keep this versioned whenever call sound/importance changes so existing
// installs receive the corrected ringtone configuration.
const INCOMING_CALL_CHANNEL_ID = 'speakly_incoming_calls_v4';
const PENDING_ACCEPTED_CALL_KEY = 'pendingAcceptedNotificationCall';
const HANDLED_CALL_KEY = 'handledNotificationCall';
const ACTION_TTL_MS = 60_000;
const MISSED_CALL_DELAY_MS = 30_000;
export const ACCEPTED_CALL_EVENT = 'SpeaklyAcceptedNotificationCall';
let tokenQueue = Promise.resolve();
let onlineNotificationQueue: Promise<void> = Promise.resolve();
let signingOut = false;
let permissionRequest: Promise<void> | undefined;

function ensureNotificationPermissionRequested() {
  if (!permissionRequest) {
    permissionRequest = notifee
      .requestPermission()
      .then(() => undefined)
      .catch(error => {
        permissionRequest = undefined;
        throw error;
      });
  }

  return permissionRequest;
}

export async function createNotificationChannel() {
  return notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Speakly 121 notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

async function configureIncomingCallActions() {
  await notifee.setNotificationCategories([
    {
      id: 'incoming-call',
      actions: [
        { id: 'reject-call', title: 'Decline', destructive: true },
        { id: 'accept-call', title: 'Answer', foreground: true },
      ],
    },
  ]);
}

export async function displayPushNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
) {
  if (message.data?.type === 'incoming_call') {
    // While foregrounded, the room listener shows the in-app incoming call
    // screen and ringtone. A system notification here would duplicate it.
    if (AppState.currentState === 'active') return;
    const callId = String(message.data?.callId || '');
    const femaleUid = String(message.data?.femaleUid || '');
    if (callId && femaleUid) {
      await displayIncomingCallNotification(
        callId,
        String(message.data?.callerName || 'Koi'),
        femaleUid,
      );
    }
    return;
  }
  const title = message.notification?.title ?? message.data?.title;
  const body = message.notification?.body ?? message.data?.body;
  if (typeof title !== 'string' && typeof body !== 'string') return;

  const channelId = await createNotificationChannel();
  await notifee.displayNotification({
    id: message.messageId,
    title: typeof title === 'string' ? title : 'Speakly 121',
    body: typeof body === 'string' ? body : undefined,
    data: message.data,
    android: {
      channelId,
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
      sound: 'default',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        banner: true,
        list: true,
        sound: true,
        badge: false,
      },
    },
  });
}

export async function displayIncomingCallNotification(
  callId: string,
  callerName: string,
  femaleUid: string,
) {
  const notificationId = `incoming-call-${callId}`;
  const displayedNotifications = await notifee.getDisplayedNotifications();
  if (displayedNotifications.some(item => item.id === notificationId)) return;

  if (Platform.OS === 'android') {
    try {
      await NativeModules.CallNotification?.prepareIncomingCallChannel?.();
      await NativeModules.CallNotification?.startIncomingCallRingtone?.();
    } catch (error) {
      console.warn('Unable to start the incoming call ringtone:', error);
    }
  }
  await configureIncomingCallActions();
  const channelId = await notifee.createChannel({
    id: INCOMING_CALL_CHANNEL_ID,
    name: 'Incoming voice calls',
    description: 'Alerts you when a new call comes in',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    visibility: AndroidVisibility.PUBLIC,
  });
  await notifee.displayNotification({
    id: notificationId,
    title: 'Incoming call',
    body: `${callerName || 'Someone'} is calling you`,
    data: { type: 'incoming_call', callId, femaleUid },
    android: {
      channelId,
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
      importance: AndroidImportance.HIGH,
      category: AndroidCategory.CALL,
      visibility: AndroidVisibility.PUBLIC,
      ongoing: true,
      onlyAlertOnce: true,
      fullScreenAction: {
        id: 'default',
      },
      actions: [
        {
          title: 'Decline',
          icon: 'ic_call_reject',
          pressAction: { id: 'reject-call' },
        },
        {
          title: 'Answer',
          icon: 'ic_call_accept',
          pressAction: { id: 'accept-call', launchActivity: 'default' },
        },
      ],
    },
    ios: {
      categoryId: 'incoming-call',
      sound: 'default',
      foregroundPresentationOptions: {
        banner: true,
        list: true,
        sound: true,
        badge: false,
      },
    },
  });

  const missedCallTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: Date.now() + MISSED_CALL_DELAY_MS,
  };
  await notifee.createTriggerNotification(
    {
      id: notificationId,
      title: 'Missed call',
      body: `You missed a call from ${callerName || 'someone'}`,
      data: { type: 'missed_call', callId, femaleUid },
      android: {
        channelId,
        smallIcon: 'ic_notification',
        pressAction: { id: 'default' },
        category: AndroidCategory.CALL,
        sound: 'default',
      },
      ios: {
        sound: 'default',
      },
    },
    missedCallTrigger,
  );
}

export const cancelIncomingCallNotification = async (callId: string) => {
  if (Platform.OS === 'android') {
    try {
      await NativeModules.CallNotification?.stopIncomingCallRingtone?.();
    } catch (error) {
      console.warn('Unable to stop call ringtone:', error);
    }
  }
  await Promise.all([
    notifee.cancelNotification(`incoming-call-${callId}`),
    notifee.cancelTriggerNotification(`incoming-call-${callId}`),
  ]);
};

export async function handleNotificationEvent(event: Event) {
  const notification = event.detail.notification;
  if (
    event.type === EventType.PRESS &&
    notification?.data?.type === 'expert_online'
  ) {
    onlineNotificationQueue = onlineNotificationQueue
      .catch(() => {})
      .then(async () => {
        const eventId = String(
          notification.data?.eventId || notification.id || '',
        );
        const hostUid = String(notification.data?.hostUid || '');
        const sentAt = Number(notification.data?.sentAt);
        const now = Date.now();
        if (
          !eventId ||
          !hostUid ||
          !Number.isFinite(sentAt) ||
          sentAt <= 0 ||
          now - sentAt > 300000 ||
          sentAt - now > 30000
        )
          return;
        let handled: Array<{ id: string; at: number }> = [];
        try {
          const stored = JSON.parse(
            (await AsyncStorage.getItem('handledOnlineHostEvents')) || '[]',
          );
          if (Array.isArray(stored)) handled = stored;
        } catch {}
        handled = handled.filter(item => now - item.at <= 300000);
        if (handled.some(item => item.id === eventId)) return;
        await AsyncStorage.setItem(
          'pendingOnlineHost',
          JSON.stringify({ hostUid, createdAt: sentAt }),
        );
        await AsyncStorage.setItem(
          'handledOnlineHostEvents',
          JSON.stringify([...handled, { id: eventId, at: now }].slice(-50)),
        );
        DeviceEventEmitter.emit('SpeaklyOnlineHostTapped');
      });
    await onlineNotificationQueue;
    return;
  }
  if (event.type !== EventType.ACTION_PRESS) return;
  const action = event.detail.pressAction?.id;
  if (action !== 'accept-call' && action !== 'reject-call') return;

  const femaleUid = String(notification?.data?.femaleUid || '');
  const callId = String(notification?.data?.callId || '');
  if (!femaleUid || !callId) return;
  if (action === 'accept-call' || auth().currentUser?.uid !== femaleUid) {
    // Persist before Auth restoration or navigation: Android may launch the
    // activity before either is ready on a cold start.
    if ((await AsyncStorage.getItem(HANDLED_CALL_KEY)) === callId) return;
    const existing = await consumePendingAcceptedCall();
    if (existing?.callId === callId) return;
    await AsyncStorage.setItem(
      PENDING_ACCEPTED_CALL_KEY,
      JSON.stringify({ femaleUid, callId, action, createdAt: Date.now() }),
    );
    DeviceEventEmitter.emit(ACCEPTED_CALL_EVENT);
    await cancelIncomingCallNotification(callId);
    return;
  }
  const currentUid = auth().currentUser?.uid;
  if (!femaleUid || !callId || currentUid !== femaleUid) return;

  await Api.post('/transitionCall', {
    hostUid: femaleUid,
    callId,
    action: 'reject',
  });

  await cancelIncomingCallNotification(callId);
}

export async function consumePendingAcceptedCall() {
  const saved = await AsyncStorage.getItem(PENDING_ACCEPTED_CALL_KEY);
  if (!saved) return null;
  try {
    const value = JSON.parse(saved);
    if (!value.createdAt || Date.now() - value.createdAt > ACTION_TTL_MS) {
      await AsyncStorage.removeItem(PENDING_ACCEPTED_CALL_KEY);
      return null;
    }
    return value?.femaleUid && value?.callId
      ? {
          femaleUid: String(value.femaleUid),
          callId: String(value.callId),
          action: value.action,
        }
      : null;
  } catch {
    await AsyncStorage.removeItem(PENDING_ACCEPTED_CALL_KEY);
    return null;
  }
}

export async function clearPendingAcceptedCall(callId: string) {
  const pending = await consumePendingAcceptedCall();
  if (pending?.callId === callId) {
    await AsyncStorage.setItem(HANDLED_CALL_KEY, callId);
    await AsyncStorage.removeItem(PENDING_ACCEPTED_CALL_KEY);
  }
}

export async function handleBackgroundMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
) {
  // FCM/APNs already displays notification payloads while the app is backgrounded.
  // Only display data-only messages here to avoid duplicate notifications.
  if (!message.notification) await displayPushNotification(message);
}

function syncToken(token?: string) {
  if (signingOut) return tokenQueue;
  const uid = auth().currentUser?.uid;
  tokenQueue = tokenQueue
    .then(async () => {
      if (!uid || signingOut || auth().currentUser?.uid !== uid) return;

      const userSnapshot = await database().ref(`users/${uid}`).once('value');
      if (!hasCompletedSignup(userSnapshot.val())) return;
      if (signingOut || auth().currentUser?.uid !== uid) return;

      // Requesting permission can emit an AppState "active" event. Keep this
      // single-flight so that event cannot recursively start another prompt.
      await ensureNotificationPermissionRequested();
      const settings = await notifee.getNotificationSettings();
      if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
        const oldToken = token ?? (await messaging().getToken());
        await Api.post('/registerPushToken', { token: oldToken, remove: true });
        return;
      }
      const currentToken = token ?? (await messaging().getToken());
      if (signingOut || auth().currentUser?.uid !== uid) return;

      await Api.post('/registerPushToken', {
        token: currentToken,
        platform: Platform.OS,
      });
    })
    .catch(error =>
      console.error('Unable to sync push notification token:', error),
    );
  return tokenQueue;
}

export async function unregisterPushNotifications() {
  signingOut = true;
  try {
    await tokenQueue;
    const uid = auth().currentUser?.uid;
    if (uid) {
      try {
        const token = await messaging().getToken();
        await Api.post('/registerPushToken', { token, remove: true });
      } catch (error) {
        console.warn('Notification registration remove nahi hui:', error);
      }
    }
    await messaging()
      .deleteToken()
      .catch(error =>
        console.warn('Device notification token remove nahi hua:', error),
      );
  } finally {
    signingOut = false;
  }
}

export function startPushNotifications() {
  const openGeneral = async (
    message: FirebaseMessagingTypes.RemoteMessage | null,
  ) => {
    if (message?.data?.type !== 'expert_online') return;
    await handleNotificationEvent({
      type: EventType.PRESS,
      detail: { notification: { data: message.data } },
    });
  };
  const unsubscribeOpened = messaging().onNotificationOpenedApp(message => {
    openGeneral(message).catch(console.warn);
  });
  messaging().getInitialNotification().then(openGeneral).catch(console.warn);
  if (Platform.OS === 'android') {
    notifee
      .getInitialNotification()
      .then(initial => {
        if (
          initial &&
          (['accept-call', 'reject-call'].includes(initial.pressAction.id) ||
            initial.notification.data?.type === 'expert_online')
        ) {
          return handleNotificationEvent({
            type:
              initial.notification.data?.type === 'expert_online'
                ? EventType.PRESS
                : EventType.ACTION_PRESS,
            detail: {
              notification: initial.notification,
              pressAction: initial.pressAction,
            },
          });
        }
      })
      .catch(error =>
        console.warn('Unable to restore notification action:', error),
      );
  }
  let active = true;
  let accountReady = false;
  const unsubscribeMessage = messaging().onMessage(message =>
    displayPushNotification(message).catch(error =>
      console.error('Unable to display push:', error),
    ),
  );
  const unsubscribeNotificationEvents = notifee.onForegroundEvent(event => {
    handleNotificationEvent(event).catch(error =>
      console.error('Unable to handle notification action:', error),
    );
  });
  const unsubscribeToken = messaging().onTokenRefresh(token => {
    syncToken(token);
  });
  let profileRef: FirebaseDatabaseTypes.Reference | undefined;
  let profileListener:
    | ((snapshot: FirebaseDatabaseTypes.DataSnapshot) => void)
    | undefined;
  let stopAvailabilityAlerts: (() => void) | undefined;
  const stopProfileListener = () => {
    stopAvailabilityAlerts?.();
    stopAvailabilityAlerts = undefined;
    if (profileRef && profileListener) {
      profileRef.off('value', profileListener);
    }
    profileRef = undefined;
    profileListener = undefined;
  };
  const unsubscribeAuth = auth().onAuthStateChanged(user => {
    stopProfileListener();
    accountReady = false;
    if (!user) return;

    const alertRef = database().ref(`availabilityAlerts/${user.uid}`);
    const alertListener = alertRef.on('child_added', snapshot => {
      const alert = snapshot.val();
      if (!alert || Date.now() - Number(alert.sentAt) > 300000) {
        snapshot.ref.remove().catch(console.warn);
        return;
      }
      if (__DEV__ || AppState.currentState === 'active') {
        displayPushNotification({
          fcmOptions: {},
          messageId: `available_${alert.hostUid}_${alert.sentAt}`,
          notification: {
            title: `${alert.hostName} is available again! 🎉`,
            body: `${alert.hostName} is free now. Connect now!`,
          },
          data: {
            type: 'expert_online',
            hostUid: alert.hostUid,
            sentAt: String(alert.sentAt),
            eventId: `available_${alert.hostUid}_${alert.sentAt}`,
          },
        })
          .then(() => snapshot.ref.remove())
          .catch(console.warn);
      }
    });
    stopAvailabilityAlerts = () => alertRef.off('child_added', alertListener);
    profileRef = database().ref(`users/${user.uid}`);
    profileListener = snapshot => {
      const nextAccountReady = hasCompletedSignup(snapshot.val());

      // The listener watches the full user record, including fcmTokens. Only
      // sync on the transition to a completed account so our own token write
      // cannot trigger another write indefinitely.
      if (nextAccountReady && !accountReady) syncToken();
      accountReady = nextAccountReady;
    };
    profileRef.on('value', profileListener);
  });
  const appState = AppState.addEventListener('change', state => {
    if (state === 'active') syncToken();
  });

  (async () => {
    await createNotificationChannel();
    await configureIncomingCallActions();
    if (active) await syncToken();
  })().catch(error =>
    console.error('Unable to initialize push notifications:', error),
  );

  return () => {
    active = false;
    unsubscribeMessage();
    unsubscribeOpened();
    unsubscribeNotificationEvents();
    unsubscribeToken();
    unsubscribeAuth();
    stopProfileListener();
    appState.remove();
  };
}
