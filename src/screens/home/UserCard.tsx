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
  CALL_RATE_PER_MINUTE,
  getFemaleAvatar,
  getMaleAvatar,
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
  const displayName = tamilName || englishName || 'N/A';
  const subtitle = [
    tamilName && tamilName !== englishName ? englishName : '',
    'Conversation expert',
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

  return (
    <SurfaceCard style={styles.card}>
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

          <View style={styles.statusWrapper}>
            <View
              style={[
                styles.onlineChip,
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
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <LinearGradient
          colors={['#FFFDF5', '#FFF0CE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coinCard}
        >
          <Image
            source={require('../../assets/coin.png')}
            style={styles.coin}
          />

          <View style={styles.priceCopy}>
            <Text style={styles.price}>{CALL_RATE_PER_MINUTE}</Text>

            <Text style={styles.perMinute}>₹ / min</Text>
          </View>
        </LinearGradient>

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
              <>
                <MaterialCommunityIcons
                  name="phone"
                  size={21}
                  color={HOME_COLORS.white}
                />

                <Text style={styles.callText}>Practice</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
};

export default memo(UserCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 15,
    borderRadius: 24,
    borderColor: HOME_COLORS.border,
    shadowColor: HOME_COLORS.tealDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: HOME_COLORS.mint,
  },
  onlineDotOuter: {
    position: 'absolute',
    right: 0,
    bottom: 3,
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
    marginLeft: 15,
  },
  name: {
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '900',
    color: HOME_COLORS.navy,
  },
  subTitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    color: HOME_COLORS.body,
  },
  location: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.subText,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.coinSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontSize: 12,
    color: Colors.onlineStatus,
  },
  divider: {
    height: 1,
    backgroundColor: HOME_COLORS.border,
    marginTop: 13,
    marginBottom: 11,
  },
  statusWrapper: {
    alignSelf: 'flex-start',
  },
  priceCopy: {
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 53,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.coinBorder,
    minWidth: 109,
  },
  coin: {
    width: 27,
    height: 27,
    resizeMode: 'contain',
  },
  price: {
    fontSize: 23,
    fontWeight: '900',
    color: HOME_COLORS.amber,
    lineHeight: 24,
  },
  perMinute: {
    marginTop: -1,
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.amber,
  },
  callButtonTouch: {
    borderRadius: 16,
    shadowColor: HOME_COLORS.tealDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  callButton: {
    height: 49,
    minWidth: 125,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonDisabled: { opacity: 0.65 },
  callText: {
    marginLeft: 9,
    fontSize: 15,
    fontWeight: '800',
    color: HOME_COLORS.white,
  },
});
