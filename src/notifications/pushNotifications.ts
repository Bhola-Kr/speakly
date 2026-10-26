import { AppState, DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import database, {
  FirebaseDatabaseTypes,
} from '@react-native-firebase/database';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidCategory,
  AuthorizationStatus,
  EventType,
  Event,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import { hasCompletedSignup } from '../utils/profileValidation';

const CHANNEL_ID = 'voicetamil_general';
const INCOMING_CALL_CHANNEL_ID = 'voicetamil_incoming_calls_v2';
const PENDING_ACCEPTED_CALL_KEY = 'pendingAcceptedNotificationCall';
const MISSED_CALL_DELAY_MS = 30_000;
export const ACCEPTED_CALL_EVENT = 'SpeaklyAcceptedNotificationCall';
let tokenQueue = Promise.resolve();
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
    name: 'Speakly notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

async function configureIncomingCallActions() {
  await notifee.setNotificationCategories([
    {
      id: 'incoming-call',
      actions: [
        { id: 'reject-call', title: 'Reject', destructive: true },
        { id: 'accept-call', title: 'Accept', foreground: true },
      ],
    },
  ]);
}

export async function displayPushNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
) {
  if (message.data?.type === 'incoming_call') {
    const callId = String(message.data?.callId || '');
    const femaleUid = String(message.data?.femaleUid || '');
    if (callId && femaleUid) {
      await displayIncomingCallNotification(
        callId,
        String(message.data?.callerName || 'Someone'),
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
    title: typeof title === 'string' ? title : 'Speakly',
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
  await configureIncomingCallActions();
  const channelId = await notifee.createChannel({
    id: INCOMING_CALL_CHANNEL_ID,
    name: 'Incoming call alerts',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });
  await notifee.displayNotification({
    id: `incoming-call-${callId}`,
    title: 'Incoming Voice Call',
    body: `${callerName || 'Someone'} is calling you`,
    data: { type: 'incoming_call', callId, femaleUid },
    android: {
      channelId,
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
      importance: AndroidImportance.HIGH,
      category: AndroidCategory.CALL,
      sound: 'default',
      loopSound: true,
      actions: [
        {
          title: 'Reject',
          icon: 'ic_call_reject',
          pressAction: { id: 'reject-call' },
        },
        {
          title: 'Accept',
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
      id: `incoming-call-${callId}`,
      title: 'Missed Voice Call',
      body: `You missed a call from ${callerName || 'Someone'}`,
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
  await Promise.all([
    notifee.cancelNotification(`incoming-call-${callId}`),
    notifee.cancelTriggerNotification(`incoming-call-${callId}`),
  ]);
};

export async function handleNotificationEvent(event: Event) {
  const notification = event.detail.notification;
  if (event.type !== EventType.ACTION_PRESS) return;
  const action = event.detail.pressAction?.id;
  if (action !== 'accept-call' && action !== 'reject-call') return;

  const femaleUid = String(notification?.data?.femaleUid || '');
  const callId = String(notification?.data?.callId || '');
  const currentUid = auth().currentUser?.uid;
  if (!femaleUid || !callId || currentUid !== femaleUid) return;

  const roomRef = database().ref(`rooms/${femaleUid}`);
  const transaction = await roomRef.transaction(room => {
    if (
      !room ||
      room.status !== 'ringing' ||
      room.currentCallId !== callId
    ) {
      return;
    }
    return {
      ...room,
      status: action === 'accept-call' ? 'accepted' : 'rejected',
      updatedAt: Date.now(),
    };
  });

  if (transaction.committed) {
    if (action === 'accept-call') {
      await database()
        .ref(`users/${femaleUid}/profile/status`)
        .set('busy');
      await AsyncStorage.setItem(
        PENDING_ACCEPTED_CALL_KEY,
        JSON.stringify({ femaleUid, callId }),
      );
      DeviceEventEmitter.emit(ACCEPTED_CALL_EVENT);
    } else {
      await database()
        .ref(`users/${femaleUid}/profile/status`)
        .set('online');
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      await roomRef.transaction(room => {
        if (
          !room ||
          room.status !== 'rejected' ||
          room.currentCallId !== callId
        ) {
          return;
        }
        return {
          ...room,
          status: 'waiting',
          currentCallId: '',
          male: null,
          updatedAt: Date.now(),
        };
      });
    }
  }

  await cancelIncomingCallNotification(callId);
}

export async function consumePendingAcceptedCall() {
  const saved = await AsyncStorage.getItem(PENDING_ACCEPTED_CALL_KEY);
  if (!saved) return null;
  await AsyncStorage.removeItem(PENDING_ACCEPTED_CALL_KEY);
  try {
    const value = JSON.parse(saved);
    return value?.femaleUid && value?.callId
      ? { femaleUid: String(value.femaleUid), callId: String(value.callId) }
      : null;
  } catch {
    return null;
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
      const ref = database().ref(`users/${uid}/fcmTokens`);
      if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
        await ref.remove();
        return;
      }
      const currentToken = token ?? (await messaging().getToken());
      if (signingOut || auth().currentUser?.uid !== uid) return;

      const savedToken = await ref.once('value');
      const savedValue = savedToken.val();
      if (
        savedValue?.token === currentToken &&
        savedValue?.platform === Platform.OS
      ) {
        return;
      }

      await ref.set({
        token: currentToken,
        platform: Platform.OS,
        updatedAt: Date.now(),
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
      await database().ref(`users/${uid}/fcmTokens`).remove();
    }
    await messaging().deleteToken();
  } finally {
    signingOut = false;
  }
}

export function startPushNotifications() {
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
  const stopProfileListener = () => {
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
    unsubscribeNotificationEvents();
    unsubscribeToken();
    unsubscribeAuth();
    stopProfileListener();
    appState.remove();
  };
}
