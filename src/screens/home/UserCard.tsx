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
import UI from '../../constants/ui';
import SurfaceCard from '../../components/SurfaceCard';
import {
  CALL_RATE_PER_MINUTE,
  getFemaleAvatar,
  getMaleAvatar,
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
          colors={[Colors.coinGradientStart, Colors.coinGradientEnd]}
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
          style={styles.callButton}
        >
          {calling ? (
            <ActivityIndicator size="small" color={Colors.white} />
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
    </SurfaceCard>
  );
};

export default memo(UserCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: UI.spacing.lg,
    marginBottom: 12,
    padding: UI.spacing.lg,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrapper: {
    position: 'relative',
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: UI.radius.card,
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
    marginLeft: 14,
  },

  name: {
    fontSize: UI.typography.sectionHeading,
    fontWeight: '600',
    color: Colors.text,
  },

  subTitle: {
    marginTop: 3,
    fontSize: UI.typography.secondary,
    lineHeight: 17,
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

    marginTop: 8,

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

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: UI.radius.button,

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
    height: 48,
    paddingHorizontal: 20,
    borderRadius: UI.radius.button,

    backgroundColor: Colors.secondary,

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
