import React, { useMemo, useState } from 'react';
import {
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

interface HistoryItem {
  id: string;
  name: string;
  avatar: string;
  duration: string;
  time: string;
  date: string;
}

const historyData: HistoryItem[] = [
  {
    id: '1',
    name: 'Ganapathy',
    avatar: 'https://randomuser.me/api/portraits/men/31.jpg',
    duration: '2m 13s',
    time: '2:57 AM',
    date: 'Today',
  },
  {
    id: '2',
    name: 'Priya',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    duration: '8m 21s',
    time: '1:20 AM',
    date: 'Today',
  },
  {
    id: '3',
    name: 'Riya',
    avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
    duration: '4m 50s',
    time: '8:15 PM',
    date: 'Yesterday',
  },
  {
    id: '4',
    name: 'Rahul',
    avatar: 'https://randomuser.me/api/portraits/men/56.jpg',
    duration: '18m 09s',
    time: '6:40 PM',
    date: 'Yesterday',
  },
];

const HistoryScreen = () => {
  const [menuVisible, setMenuVisible] = useState(false);

  const groupedData = useMemo(() => {
    const list: any[] = [];
    let lastDate = '';

    historyData.forEach(item => {
      if (lastDate !== item.date) {
        list.push({
          type: 'header',
          title: item.date,
        });

        lastDate = item.date;
      }

      list.push({
        type: 'item',
        ...item,
      });
    });

    return list;
  }, []);

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

    return (
      <TouchableOpacity activeOpacity={0.9} style={styles.card}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />

        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.bottomRow}>
            <Text style={styles.duration}>{item.duration}</Text>

            <Text style={styles.time}>{item.time}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.callButton}>
          <Ionicons name="call" size={18} color={Colors.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History</Text>

          <Text style={styles.subtitle}>Your recent conversations</Text>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groupedData}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
      />

      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.popup}>
            <TouchableOpacity style={styles.popupItem}>
              <Ionicons name="person-outline" size={20} color={Colors.text} />

              <Text style={styles.popupText}>My Profile</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.popupItem}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />

              <Text style={[styles.popupText, { color: Colors.danger }]}>
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
  },

  info: {
    flex: 1,
    marginLeft: 16,
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

  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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

export default HistoryScreen;
