import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { femaleAvatars } from '../../constants/constants';
import Colors from '../../constants/colors';

interface Props {
  item: any;
  callNow: () => void;
}

const UserCard = ({ item, callNow }: Props) => {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Image
          source={femaleAvatars[item.avatarId].image || femaleAvatars[0].image}
          style={styles.avatar}
        />

        <View style={styles.info}>
          <Text style={styles.name}>{item.tamilName}</Text>

          <Text style={styles.rating}>
            {item.englishName} • {item.age} yrs
          </Text>

          <Text style={styles.sub}>
            {item.city}, {item.state}
          </Text>

          <View style={styles.ratingRow}>
            <MaterialCommunityIcons
              name="star"
              size={18}
              color={Colors.secondary}
            />
            <Text style={styles.rating}>{item.rating}</Text>
          </View>

          <View style={styles.onlineRow}>
            <View style={styles.dot} />
            <Text style={styles.online}>Online</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>₹{item.price}</Text>

          <Text style={styles.minute}>per minute</Text>
        </View>

        <TouchableOpacity
          onPress={callNow}
          activeOpacity={0.9}
          style={{
            height: 48,
            borderRadius: 24,
            backgroundColor: Colors.primary,
            paddingHorizontal: 22,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
          }}
        >
          <MaterialCommunityIcons
            name="phone"
            size={18}
            color={Colors.secondary}
          />

          <Text
            style={{
              color: Colors.secondary,
              fontWeight: '700',
              marginLeft: 8,
            }}
          >
            Call Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 18,
  },

  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 22,

    padding: 16,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 5,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 20,
  },

  info: {
    flex: 1,
    marginLeft: 16,
  },

  name: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
  },

  sub: {
    marginTop: 4,
    color: Colors.subText,
    fontSize: 14,
  },

  onlineRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16C784',
  },

  online: {
    marginLeft: 6,
    color: '#16C784',
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  price: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.secondary,
  },

  minute: {
    fontSize: 14,
    color: Colors.subText,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  rating: {
    marginLeft: 6,
    color: Colors.text,
    fontWeight: '600',
  },
});

export default UserCard;
