import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, FlatList, StatusBar, Text, View } from 'react-native';

import Header from './Header';
import Banner from './Banner';
import CategoryList from './CategoryList';
import UserCard from './UserCard';

import Colors from '../../constants/colors';
import { categories, experts } from '../../constants/dummyData';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [selected, setSelected] = useState('All');

  const filtered =
    selected === 'All'
      ? experts
      : experts.filter(item => item.category === selected);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <FlatList
        contentContainerStyle={{ paddingBottom: 120 }}
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Header
              walletPress={() => navigation.navigate('Wallet')}
              userProfilePress={() => navigation.navigate('ProfileSetting')}
            />

            <Banner />

            <Text style={styles.heading}>Featured Experts</Text>

            <CategoryList
              categories={categories}
              selected={selected}
              onSelect={setSelected}
            />
          </>
        }
        renderItem={({ item }) => (
          <UserCard
            item={item}
            callNow={() => {
              navigation.navigate('OutgoingCall', { user: item });
            }}
          />
        )}
      />
    </SafeAreaView>
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

export default HomeScreen;
