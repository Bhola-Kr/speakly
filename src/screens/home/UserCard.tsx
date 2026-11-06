import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import SurfaceCard from '../../components/SurfaceCard';
import {
  getFemaleAvatar,
  getMaleAvatar,
  normalizeCallRate,
} from '../../constants/constants';

const HOME_COLORS = {
  navy: '#071A2D',
  tealDark: '#078A7D',
  body: '#747B91',
  white: '#FFFFFF',
  border: '#E0ECEA',
  mint: '#E1FAF5',
  amber: '#8A4B00',
};

interface Props {
  item: any;
  onCall: (item: any) => void;
  calling?: boolean;
}

const statusConfig = {
  online: {
    text: 'Online',
    color: Colors.onlineStatus,
    background: Colors.onlineSurface,
  },
  busy: {
    text: 'Busy',
    color: Colors.busy,
    background: Colors.busySurface,
  },
  offline: {
    text: 'Offline',
    color: Colors.offline,
    background: Colors.offlineSurface,
  },
};

const UserCard = ({ item, onCall, calling = false }: Props) => {
  const tamilName = String(item?.profile?.tamilName || '').trim();
  const englishName = String(item?.profile?.name || '').trim();
  const supportedLanguages: string[] = Array.isArray(
    item?.profile?.supportedLanguages,
  )
    ? item.profile.supportedLanguages
        .map((language: unknown) => String(language).trim())
        .filter(Boolean)
    : [];
  const practiceLanguage =
    supportedLanguages.join(', ') ||
    String(item?.profile?.practiceLanguage || '').trim();
  const displayName = tamilName || englishName || 'N/A';
  const subtitle = [
    tamilName && tamilName !== englishName ? englishName : '',
    'Voice expert',
  ]
    .filter(Boolean)
    .join(' • ');
  const avatar =
    String(item?.profile?.gender).toLowerCase() === 'female'
      ? getFemaleAvatar(item?.profile?.avatarId)
      : getMaleAvatar(item?.profile?.avatarId);
  const currentStatus =
    statusConfig[item?.profile?.status as keyof typeof statusConfig] ||
    statusConfig.offline;
  const callRate = normalizeCallRate(item?.profile?.price);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onCall(item)}
      disabled={calling}
      accessibilityRole="button"
      accessibilityLabel={`Call ${displayName}`}
    >
      <SurfaceCard style={[styles.card, calling && styles.cardDisabled]}>
        <View style={styles.row}>
        <View style={styles.avatarWrapper}>
          <Image source={avatar} style={styles.avatar} />

          <View style={styles.onlineDotOuter}>
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor: currentStatus.color,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>
            {displayName}
          </Text>

          <Text numberOfLines={1} style={styles.subTitle}>
            {subtitle}
          </Text>

          {/* <Text numberOfLines={1} style={styles.location}>
            📍 {item.city}, {item.state}
          </Text> */}

          <View style={styles.chipRow}>
            {Boolean(practiceLanguage) && (
              <View style={styles.languageChip}>
                <MaterialCommunityIcons
                  name="translate"
                  size={14}
                  color={HOME_COLORS.tealDark}
                />
                <Text style={styles.languageText}>
                  {practiceLanguage}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.onlineChip,
                Boolean(practiceLanguage) && styles.onlineChipSpaced,
                {
                  backgroundColor: currentStatus.background,
                },
              ]}
            >
              <View
                style={[
                  styles.greenDot,
                  {
                    backgroundColor: currentStatus.color,
                  },
                ]}
              />

              <Text
                style={[
                  styles.onlineText,
                  {
                    color: currentStatus.color,
                  },
                ]}
              >
                {currentStatus.text}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.rateRow}>
            <Image
              source={require('../../assets/coin.png')}
              style={styles.coin}
            />
            <Text style={styles.price}>{callRate}</Text>
            <Text style={styles.perMinute}>coins/min</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onCall(item)}
            disabled={calling}
            style={styles.callButtonTouch}
          >
            <LinearGradient
              colors={['#10B49B', '#078A7D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.callButton, calling && styles.callButtonDisabled]}
            >
              {calling ? (
                <ActivityIndicator size="small" color={HOME_COLORS.white} />
              ) : (
                <MaterialCommunityIcons
                  name="phone"
                  size={23}
                  color={HOME_COLORS.white}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );
};

export default memo(UserCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderColor: HOME_COLORS.border,
    shadowColor: HOME_COLORS.tealDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.72,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: HOME_COLORS.mint,
  },
  onlineDotOuter: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: HOME_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.onlineStatus,
  },
  info: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  name: {
    fontSize: 19,
    lineHeight: 25,
    paddingTop: 2,
    fontWeight: '900',
    color: HOME_COLORS.navy,
  },
  subTitle: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 1,
    color: HOME_COLORS.body,
  },
  location: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.subText,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  languageChip: {
    minWidth: 0,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: HOME_COLORS.mint,
  },
  languageText: {
    flexShrink: 1,
    marginLeft: 5,
    color: HOME_COLORS.tealDark,
    fontSize: 11,
    fontWeight: '700',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.coinSurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '700',
    fontSize: 12,
    color: Colors.coinText,
  },
  onlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.onlineSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  onlineChipSpaced: {
    marginLeft: 5,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.onlineStatus,
  },
  onlineText: {
    marginLeft: 5,
    fontWeight: '700',
    fontSize: 11,
    color: Colors.onlineStatus,
  },
  actions: {
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  coin: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  price: {
    marginLeft: 0,
    fontSize: 14,
    fontWeight: '900',
    color: HOME_COLORS.amber,
  },
  perMinute: {
    marginLeft: 2,
    fontSize: 10,
    fontWeight: '700',
    color: HOME_COLORS.amber,
  },
  callButtonTouch: {
    borderRadius: 21,
    shadowColor: HOME_COLORS.tealDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonDisabled: { opacity: 0.65 },
});
