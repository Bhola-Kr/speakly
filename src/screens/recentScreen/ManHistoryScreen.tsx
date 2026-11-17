import { TouchableOpacity } from '../../localization/components';
import { Text } from '../../localization/components';
import React, { useEffect, useState } from 'react';
import { FlatList, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';
import Colors from '../../constants/colors';

import EmptyState from './EmptyState';
import RecentCallCard from './RecentCallCard';
import RoomService, { CallHistory } from '../../firebase/RoomService';
import { copy } from '../../constants/strings';

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
              <Text style={styles.title}>{copy.recents.title}</Text>
              <Text style={styles.count}>{history.length}</Text>
            </View>

            <Text style={styles.subtitle}>{copy.recents.supportingText}</Text>
          </View>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              Alert.alert(
                'Calls Archive Karo',
                'Purani calls is list se chhup jayengi, par safe rahengi. Nayi calls yahan dikhti rahengi.',
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
                          'Pichhli Calls Archive Ho Gayi',
                          'Purani calls is list se chhupa di gayi hain.',
                        );
                      } catch {
                        Alert.alert('Error', 'Pichhli calls archive nahi hui.');
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
