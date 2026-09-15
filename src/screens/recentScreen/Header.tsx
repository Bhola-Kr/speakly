import React from 'react';

import { View, Text, Switch } from 'react-native';

import Colors from '../../constants/colors';
interface Props {
  online: boolean;

  onToggle: () => void;
}

const Header = ({ online, onToggle }: Props) => {
  return (
    <View
      style={{
        paddingHorizontal: 20,

        marginTop: 12,

        marginBottom: 20,

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 30,

          fontWeight: '700',

          color: Colors.text,
        }}
      >
        Recents
      </Text>

      <View
        style={{
          flexDirection: 'row',

          alignItems: 'center',
        }}
      >
        <Text
          style={{
            marginRight: 10,

            color: online ? Colors.secondary : Colors.subText,

            fontWeight: '600',
          }}
        >
          Online
        </Text>

        <Switch
          value={online}
          onValueChange={onToggle}
          thumbColor={online ? Colors.secondary : Colors.gray244}
          trackColor={{
            false: Colors.gray153,
            true: Colors.switchTrackOn,
          }}
        />
      </View>
    </View>
  );
};

export default Header;
