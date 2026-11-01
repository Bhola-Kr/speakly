import { useCallback } from 'react';
import { Alert } from 'react-native';

import { normalizeCallRate } from '../constants/constants';
import { useUser } from './UserContext';
import { useActiveCall } from './ActiveCallContext';

/**
 * Prevents learners from starting a paid session when their wallet is empty.
 */
export const useCallBalanceGuard = (navigation: any) => {
  const { user } = useUser();
  const { activeCall, showCall } = useActiveCall();

  return useCallback((requestedRate?: number) => {
    if (activeCall) {
      showCall();
      return false;
    }
    const isRegularUser = user?.isExpert !== true;
    const balance = Number(user?.wallet?.balance || 0);
    const callRate = normalizeCallRate(requestedRate);

    if (!isRegularUser || balance >= callRate) {
      return true;
    }

    Alert.alert(
      'Insufficient Balance',
      `You need at least ₹${callRate} in your wallet to start a call.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Balance',
          onPress: () => navigation.navigate('Wallet'),
        },
      ],
    );

    return false;
  }, [activeCall, showCall, navigation, user?.isExpert, user?.wallet?.balance]);
};
