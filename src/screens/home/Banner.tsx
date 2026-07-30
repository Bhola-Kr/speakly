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
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 20,
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            style={{
              color: Colors.white,
              fontSize: 20,
              fontWeight: '800',
            }}
          >
            Talk to{' '}
            <Text style={{ color: Colors.secondary }}>Verified Users</Text>
          </Text>

          <Text
            style={{
              color: '#B8B8B8',
              fontSize: 13,
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            Connect instantly with verified female users through private voice
            calls.
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={{
              marginTop: 12,
              backgroundColor: Colors.secondary,
              height: 38,
              borderRadius: 19,
              alignSelf: 'flex-start',
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons
              name="phone"
              size={16}
              color={Colors.black}
            />

            <Text
              style={{
                color: Colors.black,
                fontWeight: '700',
                fontSize: 13,
                marginLeft: 6,
              }}
            >
              Random Call
            </Text>
          </TouchableOpacity>
        </View>

        <MaterialCommunityIcons
          name="account-voice"
          size={60}
          color="rgba(212,175,55,0.18)"
        />
      </View>
    </LinearGradient>
  );
};

export default Banner;
