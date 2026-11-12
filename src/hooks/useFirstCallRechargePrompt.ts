import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { copy } from '../constants/strings';
import {
  claimFirstCallRechargePrompt,
  getFirstValueCall,
} from '../firebase/conversionPrompts';
import RoomService from '../firebase/RoomService';
import { useActiveCall } from './ActiveCallContext';
import { useUser } from './UserContext';

export function useFirstCallRechargePrompt(navigation: any) {
  const { user } = useUser();
  const { activeCall } = useActiveCall();
  const uid = user?.uid;
  const isExpert = user?.isExpert === true;

  useFocusEffect(
    useCallback(() => {
      if (activeCall || !uid || isExpert) return;

      let active = true;
      let pending = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const unsubscribe = RoomService.listenCallHistory(history => {
        if (pending || !getFirstValueCall(history)) return;
        pending = true;

        timer = setTimeout(() => {
          const showPrompt = async () => {
            const firstCall = await claimFirstCallRechargePrompt(uid, history);
            if (!firstCall || !active) return;

            const hostName = String(
              firstCall.femaleInfo?.tamilName ||
                firstCall.femaleInfo?.name ||
                '',
            ).trim();
            const title = hostName
              ? `Keep talking with ${hostName}?`
              : copy.postCall.title;

            Alert.alert(title, copy.postCall.message, [
              { text: copy.postCall.later, style: 'cancel' },
              {
                text: copy.postCall.action,
                onPress: () =>
                  navigation.navigate('Wallet', { preferredAmount: 20 }),
              },
            ]);
          };

          showPrompt().catch(error =>
            console.error('Unable to show first-call recharge prompt:', error),
          );
        }, 800);
      }, true);

      return () => {
        active = false;
        if (timer) clearTimeout(timer);
        unsubscribe();
      };
    }, [activeCall, isExpert, navigation, uid]),
  );
}
