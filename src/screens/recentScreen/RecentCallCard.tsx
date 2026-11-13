import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';
import Colors from '../../constants/colors';
import { femaleAvatars, normalizeCallRate } from '../../constants/constants';

import RoomService, { CallHistory } from '../../firebase/RoomService';
import { useCallBalanceGuard } from '../../hooks/useCallBalanceGuard';
import SurfaceCard from '../../components/SurfaceCard';
import { copy } from '../../constants/strings';
import {
  startOutgoingRingback,
  stopOutgoingRingback,
} from '../../utils/outgoingRingback';

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
  const avatar =
    femaleAvatars.find(a => a.id === Number(item.femaleInfo.avatarId)) ??
    femaleAvatars[0];
  const primaryLanguage =
    item.femaleInfo?.supportedLanguages?.[0] ||
    item.femaleInfo?.practiceLanguage ||
    'Not listed';
  const callRate = normalizeCallRate(
    item.callRatePerMinute || item.femaleInfo?.price,
  );
  const completed = item.status === 'Completed';
  const statusColor = completed ? Colors.success : Colors.danger;
  const statusBackground = completed
    ? Colors.onlineSurface
    : Colors.errorSurface;
  const subtitle = copy.host.roleName;

  const handleCall = async () => {
    console.log('handleCall -> item', item);
    if (calling || !canStartCall(item?.callRatePerMinute)) {
      return;
    }

    let handedOffToOutgoingScreen = false;
    startOutgoingRingback();

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
      handedOffToOutgoingScreen = true;
    } catch (error: any) {
      console.log('Call Error:', error);

      Alert.alert(
        'Call Failed',
        error?.message || 'Unable to connect the call. Please try again.',
      );
    } finally {
      if (!handedOffToOutgoingScreen) stopOutgoingRingback();
      setCalling(false);
    }
  };

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatarWrapper}>
          <Image source={avatar.image} style={styles.avatar} />
          <View style={styles.avatarDotOuter}>
            <View
              style={[styles.avatarDot, { backgroundColor: statusColor }]}
            />
          </View>
        </View>

        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.tamilName}>
            {displayName}
          </Text>

          <Text numberOfLines={1} style={styles.englishName}>
            {subtitle}
          </Text>

          <View style={styles.cardChipRow}>
            <View style={styles.cardLanguageChip}>
              <MaterialCommunityIcons
                name="translate"
                size={17}
                color={Colors.primary}
              />
              <Text numberOfLines={1} style={styles.cardLanguageText}>
                {primaryLanguage}
              </Text>
            </View>

            <View
              style={[
                styles.cardStatusChip,
                { backgroundColor: statusBackground },
              ]}
            >
              <View
                style={[styles.cardStatusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.cardStatusText, { color: statusColor }]}>
                {completed ? copy.call.ended : item.status}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatDate(item.startedAt)}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <View style={styles.cardRatePill}>
            <Text style={styles.cardRateValue}>₹{callRate}</Text>
            <Text style={styles.cardRateUnit}>/min</Text>
          </View>

          <TouchableOpacity
            disabled={calling}
            onPress={handleCall}
            accessibilityRole="button"
            accessibilityLabel={`${copy.call.callAgain}: ${displayName}`}
            style={[styles.callButton, calling && styles.callButtonDisabled]}
          >
            {calling ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <MaterialCommunityIcons
                name="phone"
                size={24}
                color={Colors.white}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SurfaceCard>
  );
};

export default RecentCallCard;
