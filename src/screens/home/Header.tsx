import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import LinearGradient from 'react-native-linear-gradient';
import Colors from '../../constants/colors';

const Header = () => {
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
          <MaterialCommunityIcons
            name="wallet-outline"
            size={20}
            color={Colors.secondary}
          />

          <Text
            style={{
              color: Colors.white,
              fontWeight: '700',
              marginHorizontal: 8,
            }}
          >
            ₹0.00
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

        <Image
          source={{
            uri: 'https://i.pravatar.cc/300?img=12',
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            marginLeft: 12,
          }}
        />
      </View>
    </View>
  );
};
export default Header;
