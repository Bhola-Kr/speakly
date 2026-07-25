import React from 'react';

import { View, Text } from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';

import Colors from '../../constants/colors';

const Item = ({ icon, title, value }: any) => (
  <View
    style={{
      flex: 1,

      alignItems: 'center',
    }}
  >
    <MaterialCommunityIcons name={icon} size={28} color={Colors.secondary} />

    <Text
      style={{
        color: Colors.subText,

        marginTop: 8,
      }}
    >
      {title}
    </Text>

    <Text
      style={{
        fontSize: 22,

        fontWeight: '700',

        color: Colors.text,

        marginTop: 4,
      }}
    >
      {value}
    </Text>
  </View>
);

const StatsCard = () => {
  return (
    <View style={styles.card}>
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <Item icon="phone-outline" title="Calls" value="0" />

        <Item icon="clock-outline" title="Minutes" value="0" />

        <Item icon="currency-inr" title="Spent" value="₹0" />
      </View>
    </View>
  );
};

export default StatsCard;
