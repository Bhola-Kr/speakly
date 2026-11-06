import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerMain}>
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

          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Call History</Text>
              <Text style={styles.count}>{history.length}</Text>
            </View>

            <Text style={styles.subtitle}>
              Completed and missed calls
            </Text>
          </View>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              Alert.alert(
                'Archive History',
                'Older calls will be hidden from this list but safely retained. New calls will continue to appear here.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Archive',
                    onPress: async () => {
                      try {
                        await RoomService.clearCallHistory();

                        Alert.alert(
                          'History Archived',
                          'Older calls have been hidden from this list.',
                        );
                      } catch {
                        Alert.alert(
                          'Error',
                          'Unable to archive your call history.',
                        );
                      }
                    },
                  },
                ],
              );
            }}
          >
            <MaterialCommunityIcons
              name="archive-outline"
              size={22}
              color={Colors.secondary}
            />

            <Text style={styles.clearText}>Archive</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <View pointerEvents="none" style={styles.backgroundArt}>
        <View style={styles.backgroundGlowTop} />
        <View style={styles.backgroundWaveLeft} />
        <View style={styles.backgroundWaveRight} />
      </View>
      {renderHeader()}

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
