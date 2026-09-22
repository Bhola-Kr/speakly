import { useCallback } from 'react';
import { Alert } from 'react-native';

import { CALL_RATE_PER_MINUTE } from '../constants/constants';
import { useUser } from './UserContext';
import { useActiveCall } from './ActiveCallContext';

/**
 * Prevents male users from starting a call when their wallet has no balance.
 */
export const useCallBalanceGuard = (navigation: any) => {
  const { user } = useUser();
  const { activeCall, showCall } = useActiveCall();

  return useCallback(() => {
    if (activeCall) {
      showCall();
      return false;
    }
    const isMale = user?.profile?.gender?.toLowerCase() === 'male';
    const balance = Number(user?.wallet?.balance || 0);

    if (!isMale || balance >= CALL_RATE_PER_MINUTE) {
      return true;
    }

    Alert.alert(
      'Insufficient Balance',
      `You need at least ₹${CALL_RATE_PER_MINUTE} in your wallet to start a call.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Balance',
          onPress: () => navigation.navigate('Wallet'),
        },
      ],
    );

    return false;
  }, [activeCall, showCall, navigation, user?.profile?.gender, user?.wallet?.balance]);
};
