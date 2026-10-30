import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';
import Colors from '../../constants/colors';
import { femaleAvatars } from '../../constants/constants';

import RoomService, { CallHistory } from '../../firebase/RoomService';
import { useCallBalanceGuard } from '../../hooks/useCallBalanceGuard';
import SurfaceCard from '../../components/SurfaceCard';

interface Props {
  item: CallHistory;
  navigation: any;
}

const formatDate = (time: number) => {
  return new Date(time).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDuration = (duration: number) => {
  const totalSeconds = Math.floor(duration / 1000);

  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;

  return `${min}m ${sec}s`;
};

const RecentCallCard = ({ item, navigation }: Props) => {
  const [calling, setCalling] = useState(false);
  const canStartCall = useCallBalanceGuard(navigation);
  const tamilName = String(item?.femaleInfo?.tamilName || '').trim();
  const englishName = String(item?.femaleInfo?.name || '').trim();
  const displayName = tamilName || englishName || 'N/A';
  const showEnglishName = Boolean(
    tamilName && englishName && tamilName !== englishName,
  );
  const avatar =
    femaleAvatars.find(a => a.id === Number(item.femaleInfo.avatarId)) ??
    femaleAvatars[0];

  const statusColor =
    item.status === 'Completed' ? Colors.success : Colors.danger;

  const handleCall = async () => {
    console.log('handleCall -> item', item);
    if (calling || !canStartCall()) {
      return;
    }

    try {
      setCalling(true);

      const room = await RoomService.callFemale(item?.femaleInfo?.uid);

      navigation.navigate('OutgoingCall', {
        user: {
          uid: item?.femaleInfo?.uid,
          name: englishName || displayName,
          tamilName,
          avatarId: item?.femaleInfo?.avatarId,
        },
        room,
      });
    } catch (error: any) {
      console.log('Call Error:', error);

      Alert.alert(
        'Call Failed',
        error?.message || 'Unable to connect the call. Please try again.',
      );
    } finally {
      setCalling(false);
    }
  };

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.row}>
        <Image source={avatar.image} style={styles.avatar} />

        <View style={styles.info}>
          <Text style={styles.tamilName}>{displayName}</Text>

          <Text style={styles.englishName}>
            {showEnglishName ? englishName : 'Voice Call'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDate(item.startedAt)}</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.label}>Duration</Text>
          <Text style={styles.value}>{formatDuration(item.duration)}</Text>
        </View>

        {/* <View>
          <Text style={styles.label}>Amount</Text>

          <View style={styles.receiveContainer}>
            <Image
              source={require('../../assets/coin.png')}
              style={styles.receiveCoin}
            />

            <Text style={styles.value}>{item.amount}</Text>
          </View>
        </View> */}
      </View>

      <View style={styles.cardFooter}>
        <View
          style={[styles.statusChip, { backgroundColor: `${statusColor}18` }]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {item.status}
          </Text>
        </View>

        <TouchableOpacity
          disabled={calling}
          onPress={handleCall}
          style={[styles.callButton, calling && styles.callButtonDisabled]}
        >
          <MaterialCommunityIcons
            name="phone"
            size={18}
            color={Colors.secondary}
          />

          <Text style={styles.callText}>
            {calling ? 'Calling...' : 'Call Again'}
          </Text>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
};

export default RecentCallCard;
