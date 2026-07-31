import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  TouchableOpacity,
  Alert,
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
          }}
        >
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

        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              Alert.alert(
                'Clear History',
                'Are you sure you want to delete your entire call history?',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await RoomService.clearCallHistory();

                        Alert.alert(
                          'History Cleared',
                          'Your call history has been deleted successfully.',
                        );
                      } catch {
                        Alert.alert(
                          'Error',
                          'Unable to clear your call history.',
                        );
                      }
                    },
                  },
                ],
              );
            }}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={22}
              color={Colors.danger}
            />

            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
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
          renderItem={({ item }) => (
            <RecentCallCard item={item} navigation={navigation} />
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default ManHistoryScreen;
