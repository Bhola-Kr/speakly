import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from './UserContext';
import { useActiveCall } from './ActiveCallContext';
import RoomService from '../firebase/RoomService';
import {
  claimReviewPrompt,
  markAlreadyReviewed,
  openAppReview,
} from '../firebase/appReview';

export function useFirstCallReview() {
  const { user } = useUser();
  const { activeCall } = useActiveCall();
  const uid = user?.uid;
  const gender = user?.profile?.gender;

  useFocusEffect(
    useCallback(() => {
      // Only a Play Store listing is configured for this app.
      if (activeCall || Platform.OS !== 'android' || !uid || gender !== 'male') return;

      let active = true;
      let pending = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const unsubscribe = RoomService.listenCallHistory(history => {
        if (
          pending ||
          !history.some(
            call => call.status === 'Completed' && call.duration > 0,
          )
        ) {
          return;
        }
        pending = true;
        // Allow the return-home transition to finish before showing the prompt.
        timer = setTimeout(() => {
          const showPrompt = async () => {
            if (!active) return;
            const claimed = await claimReviewPrompt(uid, gender, history);
            if (!claimed || !active) return;
            Alert.alert(
              'Review VoiceTamil',
              'Thank you for making your first call. Would you like to share your experience on Google Play?',
              [
                { text: 'No thanks', style: 'cancel' },
                {
                  text: 'Already reviewed',
                  onPress: () => {
                    markAlreadyReviewed(uid).catch(error =>
                      console.error('Unable to save review preference:', error),
                    );
                  },
                },
                {
                  text: 'Review app',
                  onPress: () => {
                    openAppReview(uid).catch(() =>
                      Alert.alert(
                        'Unable to open reviews',
                        'Please try Rate App from your profile.',
                      ),
                    );
                  },
                },
              ],
              { cancelable: true },
            );
          };
          showPrompt().catch(error =>
            console.error('Unable to request app review:', error),
          );
        }, 1000);
      }, true);

      return () => {
        active = false;
        if (timer) clearTimeout(timer);
        unsubscribe();
      };
    }, [uid, gender, activeCall]),
  );
}
