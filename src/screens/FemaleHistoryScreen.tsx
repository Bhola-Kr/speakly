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
      <TouchableOpacity activeOpacity={0.9} style={styles.card}>
        <Image source={require('../assets/man.png')} style={styles.avatar} />

        <View style={styles.info}>
          <Text style={styles.name}>{item.maleInfo.name}</Text>

          <View style={styles.bottomRow}>
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>

            <Text style={styles.time}>{time}</Text>
          </View>
        </View>

        <View
          style={{
            alignItems: 'flex-end',
          }}
        >
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

          <View
            style={{
              marginTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Image
              source={require('../assets/coin.png')}
              style={{
                width: 18,
                height: 18,
                marginRight: 4,
              }}
            />

            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: Colors.secondary,
              }}
            >
              {item.amount}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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
                  'Clear Call History',
                  'Are you sure you want to delete your entire call history? This action cannot be undone.',
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
                        } catch (e) {
                          Alert.alert(
                            'Error',
                            'Unable to clear your call history. Please try again.',
                          );
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />

              <Text
                style={[
                  styles.popupText,
                  {
                    color: Colors.danger,
                  },
                ]}
              >
                Clear History
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
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
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
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',
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
    marginHorizontal: 20,
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
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 6,
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
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 90,
    paddingRight: 20,
  },

  popup: {
    width: 220,
    backgroundColor: Colors.card,
    borderRadius: 22,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 10,
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
