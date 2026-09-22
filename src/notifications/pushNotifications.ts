import { AppState, Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import database, {
  FirebaseDatabaseTypes,
} from '@react-native-firebase/database';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';
import { hasCompletedSignup } from '../utils/profileValidation';

const CHANNEL_ID = 'voicetamil_general';
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
    name: 'VoiceTamil notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function displayPushNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
) {
  const title = message.notification?.title ?? message.data?.title;
  const body = message.notification?.body ?? message.data?.body;
  if (typeof title !== 'string' && typeof body !== 'string') return;

  const channelId = await createNotificationChannel();
  await notifee.displayNotification({
    id: message.messageId,
    title: typeof title === 'string' ? title : 'VoiceTamil',
    body: typeof body === 'string' ? body : undefined,
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
    if (active) await syncToken();
  })().catch(error =>
    console.error('Unable to initialize push notifications:', error),
  );

  return () => {
    active = false;
    unsubscribeMessage();
    unsubscribeToken();
    unsubscribeAuth();
    stopProfileListener();
    appState.remove();
  };
}
