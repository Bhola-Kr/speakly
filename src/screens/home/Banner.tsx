import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/colors';

interface Props {
  randomCall: () => void;
  calling: boolean;
}

const Banner = ({ randomCall, calling }: Props) => {
  return (
    <LinearGradient
      colors={[Colors.primary, Colors.navySurface]}
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
            Practice with{' '}
              <Text style={{ color: Colors.secondary }}>Language Experts</Text>
          </Text>

          <Text
            style={{
              color: Colors.gray184,
              fontSize: 13,
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            Pick a conversation topic and build fluency through a focused
            one-to-one voice session.
          </Text>

          <TouchableOpacity
            onPress={randomCall}
            activeOpacity={0.9}
            disabled={calling}
            style={{
              marginTop: 12,
              backgroundColor: calling ? Colors.gray138 : Colors.secondary,
              height: 42,
              borderRadius: 21,
              alignSelf: 'flex-start',
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 140,
            }}
          >
            {calling ? (
              <>
                <ActivityIndicator size="small" color={Colors.black} />

                <Text
                  style={{
                    color: Colors.white,
                    fontWeight: '700',
                    fontSize: 13,
                    marginLeft: 8,
                  }}
                >
                  Connecting...
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="phone"
                  size={16}
                color={Colors.white}
                />

                <Text
                  style={{
                    color: Colors.white,
                    fontWeight: '700',
                    fontSize: 13,
                    marginLeft: 6,
                  }}
                >
                  Find an expert
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <MaterialCommunityIcons
          name="account-voice"
          size={60}
          color={Colors.overlayGold18}
        />
      </View>
    </LinearGradient>
  );
};

export default memo(Banner);
