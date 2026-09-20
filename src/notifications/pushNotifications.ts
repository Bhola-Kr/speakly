import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';

const CHANNEL_ID = 'voicetamil_general';
const INSTALLATION_KEY = 'pushInstallationId';
let installationPromise: Promise<string> | undefined;
let tokenQueue = Promise.resolve();
let signingOut = false;

function installationId() {
  if (!installationPromise) {
    installationPromise = (async () => {
      const saved = await AsyncStorage.getItem(INSTALLATION_KEY);
      if (saved) return saved;
      const id = `${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2)}`;
      await AsyncStorage.setItem(INSTALLATION_KEY, id);
      return id;
    })().catch(error => {
      installationPromise = undefined;
      throw error;
    });
  }
  return installationPromise;
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
      const settings = await notifee.getNotificationSettings();
      const id = await installationId();
      const ref = database().ref(`users/${uid}/fcmTokens/${id}`);
      if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
        await ref.remove();
        return;
      }
      const currentToken = token ?? (await messaging().getToken());
      if (signingOut || auth().currentUser?.uid !== uid) return;
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
      const id = await installationId();
      await database().ref(`users/${uid}/fcmTokens/${id}`).remove();
    }
    await messaging().deleteToken();
  } finally {
    signingOut = false;
  }
}

export function startPushNotifications() {
  let active = true;
  const unsubscribeMessage = messaging().onMessage(message =>
    displayPushNotification(message).catch(error =>
      console.error('Unable to display push:', error),
    ),
  );
  const unsubscribeToken = messaging().onTokenRefresh(token => {
    syncToken(token);
  });
  const unsubscribeAuth = auth().onAuthStateChanged(user => {
    if (user) syncToken();
  });
  const appState = AppState.addEventListener('change', state => {
    if (state === 'active') syncToken();
  });

  (async () => {
    await createNotificationChannel();
    if (!active) return;
    await notifee.requestPermission();
    if (active) await syncToken();
  })().catch(error =>
    console.error('Unable to initialize push notifications:', error),
  );

  return () => {
    active = false;
    unsubscribeMessage();
    unsubscribeToken();
    unsubscribeAuth();
    appState.remove();
  };
}
