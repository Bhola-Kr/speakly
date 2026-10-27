import auth from '@react-native-firebase/auth';
import { Linking } from 'react-native';
import type { CallHistory } from './RoomService';
import { databaseRef } from './firebase';

export const APP_REVIEW_URL =
  'https://play.google.com/store/apps/details?id=com.ra.speakly';

export async function claimReviewPrompt(
  uid: string,
  gender: string,
  history: CallHistory[],
): Promise<boolean> {
  if (
    auth().currentUser?.uid !== uid ||
    gender !== 'male' ||
    !history.some(call => call.status === 'Completed' && call.duration > 0)
  ) {
    return false;
  }

  // Persist before displaying, so remounts and other devices cannot ask again.
  const result = await databaseRef(`users/${uid}/appReview`)
    .transaction(
      current => {
        if (
          current?.promptedAt ||
          current?.storeOpenedAt ||
          current?.alreadyReviewedAt
        ) {
          return;
        }
        return { ...current, promptedAt: Date.now() };
      },
      undefined,
      false,
    );

  return result.committed;
}

export async function markAlreadyReviewed(uid: string) {
  if (auth().currentUser?.uid !== uid) return;
  await databaseRef(`users/${uid}/appReview`).update({
    alreadyReviewedAt: Date.now(),
  });
}

export async function openAppReview(uid?: string) {
  await Linking.openURL(APP_REVIEW_URL);
  if (uid && auth().currentUser?.uid === uid) {
    // Opening the store is not proof that a review was submitted.
    await databaseRef(`users/${uid}/appReview`).update({
      storeOpenedAt: Date.now(),
    });
  }
}
