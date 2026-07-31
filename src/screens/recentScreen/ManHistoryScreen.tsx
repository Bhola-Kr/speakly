import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';
import Colors from '../../constants/colors';

import EmptyState from './EmptyState';
import RecentCallCard from './RecentCallCard';
import RoomService, { CallHistory } from '../../firebase/RoomService';

const ManHistoryScreen = ({ navigation, route }: any) => {
  const [history, setHistory] = useState<CallHistory[]>([]);

  const showBack = route?.params?.showBack ?? false;

  useEffect(() => {
    const unsubscribe = RoomService.listenCallHistory(setHistory);

    return unsubscribe;
  }, []);

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={Colors.text}
            />
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Call History</Text>

          <Text style={styles.subtitle}>
            View all your completed and missed voice calls.
          </Text>

          <Text style={styles.count}>
            {history.length} {history.length === 1 ? 'Call' : 'Calls'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      {history.length === 0 ? (
        <EmptyState onPress={() => navigation.navigate('Home')} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.callId}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <RecentCallCard item={item} />}
        />
      )}
    </SafeAreaView>
  );
};

export default ManHistoryScreen;
