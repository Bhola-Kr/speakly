import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/colors';

const Banner = () => {
  return (
    <LinearGradient
      colors={['#202020', '#121212']}
      style={{
        marginHorizontal: 20,
        marginTop: 24,
        borderRadius: 26,
        padding: 22,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: Colors.white,
              fontSize: 24,
              fontWeight: '800',
            }}
          >
            Talk to
          </Text>

          <Text
            style={{
              color: Colors.secondary,
              fontSize: 24,
              fontWeight: '800',
              marginTop: 4,
            }}
          >
            Verified Users
          </Text>

          <Text
            style={{
              color: '#BBBBBB',
              marginTop: 14,
              lineHeight: 22,
            }}
          >
            Start meaningful voice conversations with verified female users.
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={{
              marginTop: 22,
              backgroundColor: Colors.secondary,
              height: 48,
              borderRadius: 24,
              alignSelf: 'flex-start',
              paddingHorizontal: 22,
              justifyContent: 'center',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons
              name="phone"
              size={18}
              color={Colors.black}
            />

            <Text
              style={{
                color: Colors.black,
                fontWeight: '700',
                marginLeft: 8,
              }}
            >
              Random Call
            </Text>
          </TouchableOpacity>
        </View>

        <MaterialCommunityIcons
          name="account-voice"
          size={95}
          color="rgba(212,175,55,0.18)"
        />
      </View>
    </LinearGradient>
  );
};

export default Banner;
