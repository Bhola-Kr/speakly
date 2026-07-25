import React, { useState } from 'react';

import { SafeAreaView, FlatList } from 'react-native';

import styles from './styles';

import Header from './Header';
import StatsCard from './StatsCard';
import EmptyState from './EmptyState';
import RecentCallCard from './RecentCallCard';
import { recentCalls } from '../../constants/dummyData';

const RecentScreen = ({ navigation }: any) => {
  const [online, setOnline] = useState(true);

  // Change to [] to see the empty state
  const data = recentCalls;

  return (
    <SafeAreaView style={styles.container}>
      <Header online={online} onToggle={() => setOnline(!online)} />

      {data.length === 0 ? (
        <EmptyState onPress={() => navigation.navigate('Home')} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<StatsCard />}
          renderItem={({ item }) => <RecentCallCard item={item} />}
        />
      )}
    </SafeAreaView>
  );
};

export default RecentScreen;
