import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import database from '@react-native-firebase/database';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Colors from '../../constants/colors';
import { getUserAvatar } from '../../constants/constants';
import ChatService, { ChatSummary } from '../../firebase/ChatService';
import { useUser } from '../../hooks/UserContext';
import ChatTheme from './chatTheme';

type InboxItem = ChatSummary & { male: any };

const ChatHostInboxScreen = ({ navigation }: any) => {
  const { user } = useUser();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hostUid = String(user?.uid || '');
    if (!hostUid || user?.isChatHost !== true) {
      setLoading(false);
      return;
    }
    let active = true;
    const unsubscribe = ChatService.listenToHostChats(hostUid, async chats => {
      const next = await Promise.all(
        chats.map(async chat => {
          const snapshot = await database().ref(`users/${chat.maleUid}`).once('value');
          return { ...chat, male: snapshot.val() };
        }),
      );
      if (active) {
        setItems(next.filter(item => item.male));
        setLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.isChatHost, user?.uid]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar
        backgroundColor={ChatTheme.heroStart}
        barStyle="light-content"
        translucent={false}
      />
      <View style={styles.container}>
        <LinearGradient colors={[ChatTheme.heroStart, ChatTheme.heroMiddle, ChatTheme.heroEnd]} locations={[0, 0.68, 1]} style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>FEMALE CHAT</Text>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Your replies are always free</Text>
        </View>
        <View style={styles.freeBadge}>
          <Ionicons name="chatbubble-ellipses" size={18} color={ChatTheme.goldLight} />
          <Text style={styles.freeText}>FREE</Text>
        </View>
        </LinearGradient>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={ChatTheme.goldDeep} size="large" />
        ) : (
          <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const name = String(item.male?.profile?.name || 'Member');
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.86}
                onPress={() => navigation.navigate('ChatConversation', { host: item.male })}
              >
                <Image source={getUserAvatar(item.male)} style={styles.avatar} />
                <View style={styles.copy}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || 'Open conversation'}</Text>
                </View>
                {Number(item.unreadCount || 0) > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {Number(item.unreadCount) > 99 ? '99+' : Number(item.unreadCount)}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.openButton}>
                  <Ionicons name="chevron-forward" size={21} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={34} color={Colors.coinHighlight} /></View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>New member messages will appear here.</Text>
            </View>
          }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ChatTheme.heroStart },
  container: { flex: 1, backgroundColor: ChatTheme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, shadowColor: Colors.black, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  eyebrow: { color: ChatTheme.goldLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }, title: { color: Colors.white, fontSize: 24, fontWeight: '800', marginTop: 3 }, subtitle: { color: Colors.darkTextMuted, fontSize: 11, marginTop: 3 },
  freeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ChatTheme.heroPanel, borderWidth: 1, borderColor: ChatTheme.heroPanelBorder, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 }, freeText: { color: ChatTheme.goldLight, fontSize: 9, fontWeight: '900' },
  loader: { marginTop: 60 }, list: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 110, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: ChatTheme.warmCard, borderRadius: 20, padding: 13, marginBottom: 11, borderWidth: 1, borderColor: ChatTheme.warmBorder, elevation: 3, shadowColor: ChatTheme.shadow, shadowOpacity: 0.09, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  avatar: { width: 56, height: 56, borderRadius: 18, marginRight: 12, borderWidth: 1.5, borderColor: ChatTheme.avatarBorder }, copy: { flex: 1, minWidth: 0 }, name: { color: Colors.text, fontSize: 15, fontWeight: '800' }, preview: { color: Colors.subText, fontSize: 11, marginTop: 5 }, openButton: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: ChatTheme.goldLight, shadowColor: ChatTheme.goldDeep, shadowOpacity: 0.22, shadowRadius: 5, elevation: 2 },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.blueAction, paddingHorizontal: 6, marginRight: 8 }, unreadText: { color: Colors.white, fontSize: 10, fontWeight: '900' },
  empty: { alignItems: 'center', paddingTop: 95 }, emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.coinSurface, borderWidth: 1, borderColor: ChatTheme.avatarBorder }, emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: '800', marginTop: 15 }, emptyText: { color: Colors.subText, fontSize: 12, marginTop: 6 },
});

export default ChatHostInboxScreen;
