import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { getMaleAvatar } from '../constants/constants';
import RoomService, { CallHistory } from '../firebase/RoomService';
import Colors from '../constants/colors';
import { copy } from '../constants/strings';

const COLORS = {
  background: Colors.background,
  navy: Colors.textPrimary,
  teal: Colors.primary,
  tealDark: Colors.primaryPressed,
  tealPale: Colors.primaryLight,
  body: Colors.textSecondary,
  white: Colors.surface,
  border: Colors.border,
  line: Colors.divider,
  purple: Colors.accent,
  successSurface: Colors.successStrongSurface,
  danger: Colors.error,
  dangerSurface: Colors.errorStrongSurface,
  shadow: Colors.primary,
};

interface Props {
  navigation: any;
}

type HistoryListItem =
  | { type: 'header'; title: string; key: string }
  | ({ type: 'item' } & CallHistory);

const FemaleHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [history, setHistory] = useState<CallHistory[]>([]);

  useEffect(() => {
    const unsubscribe = RoomService.listenCallHistory(setHistory);
    return unsubscribe;
  }, []);

  const groupedData = useMemo<HistoryListItem[]>(() => {
    const list: HistoryListItem[] = [];
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
          key: `header-${date}`,
        });
        lastDate = date;
      }

      list.push({ type: 'item', ...item });
    });

    return list;
  }, [history]);

  const formatDuration = (duration: number) => {
    const totalSeconds = Math.floor(duration / 1000);
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}m ${sec}s`;
  };

  const renderItem = ({ item }: { item: HistoryListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dateContainer}>
          <View style={styles.line} />
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={15} color={COLORS.body} />
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
    const completed = item.status === 'Completed';

    return (
      <View style={styles.card}>
        <View style={styles.cardGlow} />
        <Image
          source={getMaleAvatar(item.maleInfo?.avatarId)}
          style={styles.avatar}
        />

        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>
            {item.maleInfo?.name || 'Caller'}
          </Text>
          <View style={styles.durationRow}>
            <Ionicons name="call-outline" size={16} color={COLORS.purple} />
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
          </View>
          <Text style={styles.time}>{time}</Text>
        </View>

        <View style={styles.cardActions}>
          <View
            style={[styles.statusChip, !completed && styles.statusChipMissed]}
          >
            <Ionicons
              name={completed ? 'checkmark' : 'close'}
              size={16}
              color={completed ? COLORS.teal : COLORS.danger}
            />
            <Text
              style={[styles.statusText, !completed && styles.statusTextMissed]}
            >
              {completed ? copy.call.ended : item.status}
            </Text>
          </View>

          <View style={styles.amountRow}>
            <MaterialCommunityIcons
              name="message-processing-outline"
              size={18}
              color={COLORS.teal}
            />
            <Text style={styles.amount}>{item.amount}</Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={24}
          color={Colors.disabled}
          style={styles.chevron}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />

      <View style={styles.backgroundGlowOne} pointerEvents="none" />
      <View style={styles.backgroundGlowTwo} pointerEvents="none" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{copy.recents.title}</Text>
          <Text style={styles.subtitle}>
            {copy.recents.supportingText}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Call history options"
          activeOpacity={0.82}
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-vertical" size={21} color={COLORS.navy} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groupedData}
        keyExtractor={item => (item.type === 'header' ? item.key : item.callId)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          groupedData.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="time-outline" size={38} color={COLORS.teal} />
            </View>
            <Text style={styles.emptyTitle}>{copy.recents.emptyTitle}</Text>
            <Text style={styles.emptyDescription}>
              {copy.recents.emptyText}
            </Text>
          </View>
        }
      />

      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.popup}>
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('EditProfile', { gender: 'female' });
              }}
              style={styles.popupItem}
            >
              <Ionicons name="person-outline" size={20} color={COLORS.navy} />
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
                    { text: 'Cancel', style: 'cancel' },
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
                color={COLORS.tealDark}
              />
              <Text style={[styles.popupText, styles.archiveText]}>
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
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  backgroundGlowOne: {
    position: 'absolute',
    width: 330,
    height: 330,
    top: -150,
    right: -170,
    borderRadius: 165,
    backgroundColor: 'rgba(252,229,235,0.62)',
  },
  backgroundGlowTwo: {
    position: 'absolute',
    width: 280,
    height: 280,
    left: -190,
    bottom: 80,
    borderRadius: 140,
    backgroundColor: 'rgba(255,229,237,0.42)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 30,
    marginTop: 20,
    marginBottom: 22,
  },
  title: {
    color: COLORS.navy,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.body,
    fontSize: 14.5,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  listContent: {
    paddingBottom: 120,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 5,
    marginBottom: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.line,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
  },
  dateText: {
    marginLeft: 8,
    color: COLORS.body,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    minHeight: 106,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginHorizontal: 18,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 3,
  },
  cardGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    right: 25,
    bottom: -105,
    borderRadius: 85,
    backgroundColor: 'rgba(252,229,235,0.38)',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 17,
    backgroundColor: COLORS.tealPale,
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginLeft: 17,
  },
  name: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '800',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  duration: {
    marginLeft: 6,
    color: COLORS.purple,
    fontSize: 15,
    fontWeight: '800',
  },
  time: {
    marginTop: 3,
    color: COLORS.body,
    fontSize: 13,
  },
  cardActions: {
    width: 108,
    alignItems: 'center',
    marginRight: 20,
  },
  statusChip: {
    minWidth: 106,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: COLORS.successSurface,
  },
  statusChipMissed: {
    backgroundColor: COLORS.dangerSurface,
  },
  statusText: {
    marginLeft: 5,
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '800',
  },
  statusTextMissed: {
    color: COLORS.danger,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
  },
  amount: {
    marginLeft: 7,
    color: COLORS.purple,
    fontSize: 15,
    fontWeight: '800',
  },
  chevron: {
    position: 'absolute',
    right: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 72,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealPale,
  },
  emptyTitle: {
    marginTop: 18,
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: '800',
  },
  emptyDescription: {
    marginTop: 7,
    color: COLORS.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 105,
    paddingRight: 20,
    backgroundColor: 'rgba(37,27,32,0.16)',
  },
  popup: {
    width: 220,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
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
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '600',
  },
  archiveText: {
    color: COLORS.tealDark,
  },
  divider: {
    height: 1,
    marginHorizontal: 18,
    backgroundColor: COLORS.border,
  },
});

export default FemaleHistoryScreen;
