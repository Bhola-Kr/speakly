import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

import LinearGradient from 'react-native-linear-gradient';
import Colors from '../../constants/colors';
import { useUser } from '../../hooks/UserContext';
import { femaleAvatars, getUserAvatar } from '../../constants/constants';

interface Props {
  userProfilePress: () => void;
  walletPress: () => void;
}

const Header = ({ userProfilePress, walletPress }: Props) => {
  const { user } = useUser();
  return (
    <View
      style={{
        paddingHorizontal: 20,
        marginTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        style={{
          fontSize: 30,
          fontWeight: '800',
          color: Colors.text,
        }}
      >
        தமிழ்
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={walletPress}>
          <LinearGradient
            colors={Colors.buttonGradient}
            style={{
              height: 42,
              borderRadius: 21,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Image
              source={require('../../assets/coin.png')}
              style={{
                width: 24,
                height: 24,
                resizeMode: 'contain',
              }}
            />

            <Text
              style={{
                color: Colors.white,
                fontWeight: '700',
                marginHorizontal: 8,
              }}
            >
              0
            </Text>

            <TouchableOpacity
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: Colors.secondary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="plus"
                size={16}
                color={Colors.black}
              />
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={userProfilePress}>
          <Image
            source={getUserAvatar(user)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              marginLeft: 12,
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default Header;
