import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

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
    <View
      style={{
        paddingHorizontal: 20,
        marginTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: Colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="message-text-outline"
            size={22}
            color={Colors.white}
          />
        </View>
        <Text
          style={{
            marginLeft: 9,
            fontSize: 25,
            fontWeight: '800',
            color: Colors.primary,
            letterSpacing: -1.2,
          }}
        >
          speakly
        </Text>
      </View>

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
              {user?.wallet?.balance || 0}
            </Text>

            <View
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
            </View>
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
