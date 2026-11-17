import { getApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import { Platform } from 'react-native';

// Keep development emulator sessions self-contained: custom tokens minted by
// the local Functions emulator must be consumed by the Auth emulator, and app
// data should stay in the local Realtime Database emulator.
if (__DEV__) {
  const emulatorHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  auth().useEmulator(`http://${emulatorHost}:9099`);
  database().useEmulator(emulatorHost, 9000);
}

export const FIREBASE_DATA_ROOT = 'speakly';

/**
 * Returns a Realtime Database reference scoped to this app's data root.
 * Keeping this in one place prevents accidental reads or writes outside
 * /speakly.
 */
export const databaseRef = (path?: string) => {
  if (path?.startsWith('.info/')) return database().ref(path);
  const root = database().ref(FIREBASE_DATA_ROOT);
  const normalizedPath = path?.replace(/^\/+|\/+$/g, '');

  return normalizedPath ? root.child(normalizedPath) : root;
};

/** Compatibility facade for modules that use the namespaced database API. */
export const scopedDatabase = () => ({ ref: databaseRef });

export default getApp();
