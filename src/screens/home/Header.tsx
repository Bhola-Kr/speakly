import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import LinearGradient from 'react-native-linear-gradient';
import Colors from '../../constants/colors';
import { useUser } from '../../hooks/UserContext';
import { getUserAvatar } from '../../constants/constants';

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
          <MaterialCommunityIcons
            name="message-text-outline"
            size={22}
            color={Colors.white}
          />
        </View>
        <Text style={styles.brand}>
          speakly
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={walletPress} accessibilityLabel="Open wallet">
          <LinearGradient
            colors={Colors.buttonGradient}
            style={styles.wallet}
          >
            <Image
              source={require('../../assets/coin.png')}
              style={styles.coin}
            />

            <Text style={styles.balance}>
              {user?.wallet?.balance || 0}
            </Text>

            <View style={styles.plus}>
              <MaterialCommunityIcons
                name="plus"
                size={16}
                color={Colors.primary}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={userProfilePress} accessibilityLabel="Open profile">
          <Image
            source={getUserAvatar(user)}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default Header;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    marginLeft: 10,
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1.2,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  wallet: {
    height: 44,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coin: { width: 22, height: 22, resizeMode: 'contain' },
  balance: { color: Colors.white, fontWeight: '800', marginHorizontal: 7 },
  plus: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    marginLeft: 10,
    borderWidth: 2,
    borderColor: Colors.white,
  },
});
