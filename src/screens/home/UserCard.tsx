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
import { copy } from '../../constants/strings';
import {
  getFemaleAvatar,
  getMaleAvatar,
  normalizeCallRate,
} from '../../constants/constants';

const HOME_COLORS = {
  navy: Colors.textPrimary,
  tealDark: Colors.primary,
  body: Colors.textSecondary,
  white: Colors.surface,
  mint: Colors.primaryLight,
  amber: '#8A4B00',
};

interface Props {
  item: any;
  onCall: (item: any) => void;
  calling?: boolean;
}

const statusConfig = {
  online: {
    text: copy.home.online,
    color: Colors.onlineStatus,
    background: Colors.onlineSurface,
  },
  busy: {
    text: copy.home.busy,
    color: Colors.busy,
    background: Colors.busySurface,
  },
  offline: {
    text: copy.home.offline,
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
  const primaryLanguage =
    supportedLanguages[0] ||
    String(item?.profile?.practiceLanguage || '').trim() ||
    'Not listed';
  const displayName = tamilName || englishName || 'N/A';
  const subtitle = copy.host.roleName;
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

            <View style={styles.chipRow}>
              <View style={styles.languageChip}>
                <MaterialCommunityIcons
                  name="translate"
                  size={17}
                  color={Colors.primary}
                />
                <Text numberOfLines={1} style={styles.languageText}>
                  {primaryLanguage}
                </Text>
              </View>

              <View
                style={[
                  styles.onlineChip,
                  styles.onlineChipSpaced,
                  {
                    backgroundColor: currentStatus.background,
                  },
                ]}
              >
                <View
                  style={[
                    styles.greenDot,
                    { backgroundColor: currentStatus.color },
                  ]}
                />
                <Text
                  style={[
                    styles.onlineText,
                    { color: currentStatus.color },
                  ]}
                >
                  {currentStatus.text}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <View style={styles.ratePill}>
              <Text style={styles.price}>{callRate}</Text>
              <Text style={styles.perMinute}> coins/min</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onCall(item)}
              disabled={calling}
              accessibilityRole="button"
              accessibilityLabel={`${copy.home.startCall}: ${displayName}`}
              style={styles.callButtonTouch}
            >
              <LinearGradient
                colors={[Colors.onlineStatus, '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.callButton,
                  calling && styles.callButtonDisabled,
                ]}
              >
                {calling ? (
                  <ActivityIndicator size="small" color={HOME_COLORS.white} />
                ) : (
                  <MaterialCommunityIcons
                    name="phone"
                    size={24}
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
    marginBottom: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    borderColor: Colors.primaryLight,
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: HOME_COLORS.mint,
  },
  onlineDotOuter: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: HOME_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.onlineStatus,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  name: {
    fontSize: 18,
    lineHeight: 23,
    paddingTop: 2,
    fontWeight: '800',
    color: HOME_COLORS.navy,
  },
  subTitle: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 17,
    paddingTop: 1,
    color: HOME_COLORS.body,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
  },
  languageChip: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 104,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
  },
  languageText: {
    flexShrink: 1,
    marginLeft: 5,
    color: HOME_COLORS.tealDark,
    fontSize: 12,
    fontWeight: '800',
  },
  onlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.onlineSurface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 15,
  },
  onlineChipSpaced: {
    marginLeft: 5,
  },
  greenDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.onlineStatus,
  },
  onlineText: {
    marginLeft: 5,
    fontWeight: '700',
    fontSize: 12,
    color: Colors.onlineStatus,
  },
  actions: {
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: Colors.coinSurface,
  },
  price: {
    marginLeft: 0,
    fontSize: 17,
    fontWeight: '900',
    color: HOME_COLORS.amber,
  },
  perMinute: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.amber,
  },
  callButtonTouch: {
    borderRadius: 30,
    shadowColor: Colors.onlineStatus,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  callButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonDisabled: { opacity: 0.65 },
});
