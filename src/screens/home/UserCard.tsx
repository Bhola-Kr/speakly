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
import {
  calculateAge,
  CALL_RATE_PER_MINUTE,
  getFemaleAvatar,
} from '../../constants/constants';

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
    calculateAge(item?.profile?.birthYear)
      ? `${calculateAge(item?.profile?.birthYear)} yrs`
      : '',
    item?.profile?.practiceLanguage || 'Language expert',
  ]
    .filter(Boolean)
    .join(' • ');
  const currentStatus =
    statusConfig[item?.profile?.status as keyof typeof statusConfig] ||
    statusConfig.offline;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatarWrapper}>
          <Image
            source={getFemaleAvatar(item?.profile?.avatarId)}
            style={styles.avatar}
          />

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

          <View style={{ alignItems: 'center', alignSelf: 'flex-start' }}>
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
          colors={[Colors.coinGradientStart, Colors.coinGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coinCard}
        >
          <Image
            source={require('../../assets/coin.png')}
            style={styles.coin}
          />

          <View style={{ marginLeft: 6 }}>
            <Text style={styles.price}>{CALL_RATE_PER_MINUTE}</Text>

            <Text style={styles.perMinute}>₹ / min</Text>
          </View>
        </LinearGradient>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onCall(item)}
          disabled={calling}
          style={styles.callButton}
        >
          {calling ? (
            <ActivityIndicator size="small" color={Colors.secondary} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="phone"
                size={16}
                color={Colors.white}
              />

              <Text style={styles.callText}>Practice</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default memo(UserCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,

    padding: 12,

    shadowColor: Colors.primary,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

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
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
  },

  onlineDotOuter: {
    position: 'absolute',
    right: 2,
    bottom: 2,

    width: 16,
    height: 16,
    borderRadius: 8,

    backgroundColor: Colors.white,

    justifyContent: 'center',
    alignItems: 'center',
  },

  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.onlineStatus,
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },

  subTitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.subText,
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

    marginLeft: 6,

    paddingHorizontal: 8,
    paddingVertical: 3,

    borderRadius: 12,
  },

  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,

    backgroundColor: Colors.onlineStatus,
  },

  onlineText: {
    marginLeft: 4,
    fontWeight: '700',
    fontSize: 11,
    color: Colors.onlineStatus,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  coinCard: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 14,

    borderWidth: 1,
    borderColor: Colors.coinBorder,

    minWidth: 105,
  },

  coin: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  price: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.coinHighlight,
    lineHeight: 22,
  },

  perMinute: {
    marginTop: -1,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.coinDark,
  },

  callButton: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 12,

    backgroundColor: Colors.primary,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: Colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 3,
  },

  callText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
});
