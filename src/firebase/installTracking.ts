import { Platform } from 'react-native';
import database from '@react-native-firebase/database';
import DeviceInfo from 'react-native-device-info';

import { databaseRef } from './firebase';

const toFirebaseKey = (value: string) =>
  Array.from(value)
    .map(character => ('.#$[]/'.includes(character) ? '_' : character))
    .join('')
    .trim();

/** Records one production Android first-open per stable device identifier. */
export const recordFirstInstall = async () => {
  if (__DEV__ || Platform.OS !== 'android') return;

  try {
    const deviceId = toFirebaseKey(await DeviceInfo.getUniqueId());
    if (!deviceId) return;

    await databaseRef(`userFirstInstall/${deviceId}`).transaction(current => {
      if (current !== null) return undefined;

      return {
        deviceId,
        date: database.ServerValue.TIMESTAMP,
      };
    });
  } catch {
    // Install tracking is best-effort and must never block app startup.
  }
};

