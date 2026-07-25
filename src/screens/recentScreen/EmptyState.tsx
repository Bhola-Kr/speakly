import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Colors from '../../constants/colors';

interface Props {
  onPress: () => void;
}

const EmptyState = ({ onPress }: Props) => {
  return (
    <View
      style={{
        alignItems: 'center',
        marginTop: 60,
      }}
    >
      <View
        style={{
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: '#F7F1D8',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="time-outline" size={90} color={Colors.secondary} />
      </View>

      <Text
        style={{
          marginTop: 28,
          fontSize: 26,
          fontWeight: '700',
          color: Colors.text,
        }}
      >
        No Calls Yet
      </Text>

      <Text
        style={{
          marginTop: 12,
          color: Colors.subText,
          textAlign: 'center',
          lineHeight: 24,
          fontSize: 16,
          paddingHorizontal: 40,
        }}
      >
        Your recent conversations will appear here.
      </Text>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={{
          marginTop: 35,
          height: 54,
          borderRadius: 27,
          backgroundColor: Colors.primary,
          paddingHorizontal: 32,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
        }}
      >
        <Ionicons name="call" size={20} color={Colors.secondary} />

        <Text
          style={{
            marginLeft: 10,
            color: Colors.secondary,
            fontWeight: '700',
            fontSize: 16,
          }}
        >
          Call Now
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default EmptyState;
