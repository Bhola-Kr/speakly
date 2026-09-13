import { Alert } from 'react-native';

import { useUser } from './UserContext';

/**
 * Prevents male users from starting a call when their wallet has no balance.
 */
export const useCallBalanceGuard = (navigation: any) => {
  const { user } = useUser();

  const canStartCall = () => {
    const isMale = user?.profile?.gender?.toLowerCase() === 'male';
    const balance = Number(user?.wallet?.balance || 0);

    if (!isMale || balance > 0) {
      return true;
    }

    Alert.alert(
      'Insufficient Balance',
      'Please add balance to your wallet before starting a call.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Balance',
          onPress: () => navigation.navigate('Wallet'),
        },
      ],
    );

    return false;
  };

  return canStartCall;
};
