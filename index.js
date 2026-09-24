import 'react-native-gesture-handler';
/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { Buffer } from 'buffer';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import {
  handleBackgroundMessage,
  handleNotificationEvent,
} from './src/notifications/pushNotifications';

global.Buffer = Buffer;

messaging().setBackgroundMessageHandler(handleBackgroundMessage);
notifee.onBackgroundEvent(handleNotificationEvent);

AppRegistry.registerComponent(appName, () => App);
