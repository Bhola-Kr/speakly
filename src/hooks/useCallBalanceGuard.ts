import { useCallback } from 'react';
import { Alert } from 'react-native';

import { normalizeCallRate } from '../constants/constants';
import { useUser } from './UserContext';
import { useActiveCall } from './ActiveCallContext';
import { copy } from '../constants/strings';

/**
 * Prevents callers from starting a paid call when their coin balance is low.
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
      copy.wallet.lowBalanceTitle,
      `You need at least ${callRate} coins to start a call.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: copy.wallet.addCoins,
          onPress: () => navigation.navigate('Wallet'),
        },
      ],
    );

    return false;
  }, [activeCall, showCall, navigation, user?.isExpert, user?.wallet?.balance]);
};
