import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useUser } from '../../hooks/UserContext';
import { getUserAvatar } from '../../constants/constants';

const COLORS = {
  navy: '#071A2D',
  teal: '#08AA91',
  tealDark: '#078A7D',
  mint: '#E1FAF5',
  white: '#FFFFFF',
  border: '#DCEFEB',
};

interface Props {
  userProfilePress: () => void;
  walletPress: () => void;
}

const Header = ({ userProfilePress, walletPress }: Props) => {
  const { user } = useUser();
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <View style={styles.logoTail} />
          <View style={[styles.logoBar, styles.logoBarSmall]} />
          <View style={[styles.logoBar, styles.logoBarMedium]} />
          <View style={[styles.logoBar, styles.logoBarTall]} />
          <View style={[styles.logoBar, styles.logoBarMedium]} />
          <View style={[styles.logoBar, styles.logoBarSmall]} />
        </View>
        <Text style={styles.brand}>speakly</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={walletPress}
          accessibilityLabel="Open wallet"
          style={styles.wallet}
        >
          <Image
            source={require('../../assets/coin.png')}
            style={styles.coin}
          />

          <Text style={styles.balance}>{user?.wallet?.balance || 0}</Text>

          <View style={styles.plus}>
            <MaterialCommunityIcons
              name="plus"
              size={21}
              color={COLORS.tealDark}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={userProfilePress}
          accessibilityLabel="Open profile"
        >
          <Image source={getUserAvatar(user)} style={styles.avatar} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default Header;

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    paddingHorizontal: 20,
    paddingTop: 7,
    paddingBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  logoTail: {
    position: 'absolute',
    left: 7,
    bottom: -3,
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
    transform: [{ rotate: '35deg' }],
  },
  logoBar: {
    width: 3,
    marginHorizontal: 1.2,
    borderRadius: 2,
    backgroundColor: COLORS.white,
  },
  logoBarSmall: { height: 8 },
  logoBarMedium: { height: 14 },
  logoBarTall: { height: 21 },
  brand: {
    marginLeft: 11,
    fontSize: 27,
    lineHeight: 34,
    paddingTop: 2,
    fontWeight: '900',
    color: COLORS.navy,
    letterSpacing: -1.4,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  wallet: {
    height: 44,
    minWidth: 96,
    borderRadius: 16,
    paddingLeft: 9,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  coin: { width: 30, height: 30, resizeMode: 'contain' },
  balance: {
    color: COLORS.navy,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: 1,
    fontWeight: '900',
    marginLeft: 2,
    marginRight: 8,
  },
  plus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 11,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.mint,
  },
});
