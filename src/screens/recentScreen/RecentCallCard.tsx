import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';

import Colors from '../../constants/colors';
import { femaleAvatars } from '../../constants/constants';

interface Props {
  item: any;
}

const RecentCallCard = ({ item }: Props) => {
  const avatar =
    femaleAvatars.find(a => a.id === item.avatarId) || femaleAvatars[0];

  const statusColor = item.status === 'Completed' ? '#00C853' : '#F44336';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Image source={avatar.image} style={styles.avatar} />

        <View style={styles.info}>
          <Text style={styles.tamilName}>{item.tamilName}</Text>

          <Text style={styles.englishName}>{item.englishName}</Text>

          <Text style={styles.location}>
            {item.city}, {item.state}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={styles.label}>Date</Text>

          <Text style={styles.value}>{item.date}</Text>
        </View>

        <View>
          <Text style={styles.label}>Duration</Text>

          <Text style={styles.value}>{item.duration}</Text>
        </View>

        <View>
          <Text style={styles.label}>Amount</Text>

          <Text style={styles.value}>₹{item.amount}</Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: `${statusColor}20`,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              color: statusColor,
              fontWeight: '700',
            }}
          >
            {item.status}
          </Text>
        </View>

        <TouchableOpacity style={styles.callButton}>
          <MaterialCommunityIcons
            name="phone"
            size={18}
            color={Colors.secondary}
          />

          <Text style={styles.callText}>Call Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RecentCallCard;
