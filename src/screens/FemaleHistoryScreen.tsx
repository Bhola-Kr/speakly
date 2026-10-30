import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';

import Colors from '../constants/colors';
import UI from '../constants/ui';
import { getMaleAvatar } from '../constants/constants';
import RoomService, { CallHistory } from '../firebase/RoomService';

interface Props {
  navigation: any;
}

const FemaleHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [history, setHistory] = useState<CallHistory[]>([]);

  useEffect(() => {
    const unsubscribe = RoomService.listenCallHistory(setHistory);

    return unsubscribe;
  }, []);

  const groupedData = useMemo(() => {
    const list: any[] = [];
    let lastDate = '';

    history.forEach(item => {
      const date = new Date(item.startedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      if (date !== lastDate) {
        list.push({
          type: 'header',
          title: date,
        });

        lastDate = date;
      }

      list.push({
        type: 'item',
        ...item,
      });
    });

    return list;
  }, [history]);

  const formatDuration = (duration: number) => {
    const totalSeconds = Math.floor(duration / 1000);

    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;

    return `${min}m ${sec}s`;
  };

  const renderItem = ({ item }: any) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dateContainer}>
          <View style={styles.line} />

          <View style={styles.dateChip}>
            <Text style={styles.dateText}>{item.title}</Text>
          </View>

          <View style={styles.line} />
        </View>
      );
    }

    const time = new Date(item.startedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const statusColor =
      item.status === 'Completed' ? Colors.success : Colors.danger;

    return (
      <View style={styles.card}>
        <Image
          source={getMaleAvatar(item.maleInfo?.avatarId)}
          style={styles.avatar}
        />

        <View style={styles.info}>
          <Text style={styles.name}>{item.maleInfo.name}</Text>

          <View style={styles.bottomRow}>
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>

            <Text style={styles.time}>{time}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <View
            style={{
              backgroundColor: `${statusColor}20`,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: statusColor,
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {item.status}
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Image source={require('../assets/coin.png')} style={styles.coin} />

            <Text style={styles.amount}>{item.amount}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Call History</Text>

          <Text style={styles.subtitle}>
            View your recent voice call history.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        ListEmptyComponent={() => (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 30,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: Colors.subText,
                textAlign: 'center',
              }}
            >
              No Call History Found
            </Text>

            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                color: Colors.placeholder,
                textAlign: 'center',
              }}
            >
              Your completed and missed calls will appear here.
            </Text>
          </View>
        )}
        data={groupedData}
        keyExtractor={(item, index) => item.callId ?? index.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />

      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.popup}>
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);

                navigation.navigate('EditProfile', {
                  gender: 'female',
                });
              }}
              style={styles.popupItem}
            >
              <Ionicons name="person-outline" size={20} color={Colors.text} />

              <Text style={styles.popupText}>My Profile</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.popupItem}
              onPress={() => {
                setMenuVisible(false);

                Alert.alert(
                  'Archive Call History',
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
                            'Unable to archive your call history. Please try again.',
                          );
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <Ionicons
                name="archive-outline"
                size={20}
                color={Colors.secondary}
              />

              <Text
                style={[
                  styles.popupText,
                  {
                    color: Colors.secondary,
                  },
                ]}
              >
                Archive History
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    marginHorizontal: UI.spacing.lg,
    marginTop: 12,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: UI.typography.screenTitle,
    fontWeight: '600',
    color: Colors.text,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: Colors.subText,
  },

  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: UI.spacing.lg,
    marginTop: 8,
    marginBottom: 18,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },

  dateChip: {
    marginHorizontal: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },

  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.subText,
  },

  card: {
    marginHorizontal: UI.spacing.lg,
    marginBottom: 16,
    backgroundColor: Colors.white,
    borderRadius: UI.radius.card,
    padding: UI.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1,
    borderColor: Colors.border,
    ...UI.shadow.card,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.surface,
  },

  info: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },

  cardActions: {
    alignItems: 'flex-end',
  },

  amountRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  coin: {
    width: 18,
    height: 18,
    marginRight: 4,
  },

  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary,
  },

  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  duration: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
  },

  time: {
    fontSize: 14,
    color: Colors.subText,
  },

  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayBlack15,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 90,
    paddingRight: 20,
  },

  popup: {
    width: 220,
    backgroundColor: Colors.white,
    borderRadius: UI.radius.alert,
    overflow: 'hidden',

    ...UI.shadow.modal,
  },

  popupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },

  popupText: {
    marginLeft: 14,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 18,
  },
});

export default FemaleHistoryScreen;
