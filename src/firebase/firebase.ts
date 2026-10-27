import { getApp } from '@react-native-firebase/app';
import database from '@react-native-firebase/database';

export const FIREBASE_DATA_ROOT = 'speakly';

/**
 * Returns a Realtime Database reference scoped to this app's data root.
 * Keeping this in one place prevents accidental reads or writes outside
 * /speakly.
 */
export const databaseRef = (path?: string) => {
  const root = database().ref(FIREBASE_DATA_ROOT);
  const normalizedPath = path?.replace(/^\/+|\/+$/g, '');

  return normalizedPath ? root.child(normalizedPath) : root;
};

/** Compatibility facade for modules that use the namespaced database API. */
export const scopedDatabase = () => ({ ref: databaseRef });

export default getApp();
