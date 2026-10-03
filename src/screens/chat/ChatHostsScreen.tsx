import React, { useEffect, useMemo, useState } from 'react';
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
import { getFemaleAvatar } from '../../constants/constants';
import ChatService from '../../firebase/ChatService';
import { useUser } from '../../hooks/UserContext';
import ChatTheme from './chatTheme';
import ChatWelcomeOfferModal from './ChatWelcomeOfferModal';

const statusTheme = {
  online: {
    label: 'Online',
    color: Colors.onlineStatus,
    surface: Colors.onlineSurface,
  },
  busy: { label: 'Busy', color: Colors.busy, surface: Colors.busySurface },
  offline: {
    label: 'Offline',
    color: Colors.offline,
    surface: Colors.offlineSurface,
  },
};

const ChatHostsScreen = ({ navigation }: any) => {
  const { user } = useUser();
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const freeMessagesRemaining = Math.max(
    0,
    Number(user?.offers?.chatSignupFreeMessages?.remaining || 0),
  );
  const showWelcomeOffer =
    user?.profile?.gender === 'male' &&
    freeMessagesRemaining === 3 &&
    !user?.offers?.chatSignupFreeMessages?.shownAt &&
    !offerDismissed;

  const dismissWelcomeOffer = () => {
    setOfferDismissed(true);
    if (!user?.uid) return;
    database()
      .ref(`users/${user.uid}/offers/chatSignupFreeMessages/shownAt`)
      .set(database.ServerValue.TIMESTAMP)
      .catch(updateError =>
        console.warn('Unable to mark chat offer as shown:', updateError),
      );
  };

  useEffect(() => {
    const ref = database()
      .ref('users')
      .orderByChild('isChatHost')
      .equalTo(true);
    const listener = ref.on(
      'value',
      snapshot => {
        const nextHosts: any[] = [];
        snapshot.forEach(child => {
          const host = child.val();
          if (String(host?.profile?.gender).toLowerCase() === 'female') {
            nextHosts.push({ ...host, uid: child.key || host.uid });
          }
          return false;
        });
        nextHosts.sort((first, second) => {
          const order = { online: 0, busy: 1, offline: 2 };
          const firstStatus = String(
            first.profile?.status || 'offline',
          ) as keyof typeof order;
          const secondStatus = String(
            second.profile?.status || 'offline',
          ) as keyof typeof order;
          return (order[firstStatus] ?? 2) - (order[secondStatus] ?? 2);
        });
        setHosts(nextHosts);
        setError('');
        setLoading(false);
      },
      loadError => {
        setError(loadError?.message || 'Unable to load females.');
        setLoading(false);
      },
    );
    return () => ref.off('value', listener);
  }, []);

  useEffect(() => {
    if (!user?.uid || user?.profile?.gender !== 'male') {
      setUnreadCounts({});
      return;
    }
    return ChatService.listenToUnreadCounts(String(user.uid), setUnreadCounts);
  }, [user?.profile?.gender, user?.uid]);

  const header = useMemo(
    () => (
      <>
        <LinearGradient
          colors={[
            ChatTheme.heroStart,
            ChatTheme.heroMiddle,
            ChatTheme.heroEnd,
          ]}
          locations={[0, 0.68, 1]}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroBrand}>
              <Text style={styles.eyebrow}>VOICE TAMIL</Text>
            </View>
            <TouchableOpacity
              style={styles.wallet}
              onPress={() => navigation.navigate('Wallet')}
              accessibilityLabel="Open wallet"
            >
              <Image
                source={require('../../assets/coin.png')}
                style={styles.walletCoin}
              />
              <Text style={styles.walletBalance}>
                {Number(user?.wallet?.balance || 0)}
              </Text>
              <View style={styles.walletPlus}>
                <Ionicons name="add" size={16} color={Colors.black} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.heroMessageRow}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="chatbubble-ellipses"
                size={24}
                color={ChatTheme.goldLight}
              />
            </View>
            <Text style={styles.title}>
              Online la இருக்குர பொண்ணுங்க கூட Chat பண்ணுங்க.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View style={styles.securePill}>
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={Colors.success}
            />
            <Text style={styles.secureText}>Private</Text>
          </View>
        </View>
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={Colors.danger}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </>
    ),
    [error, navigation, user?.wallet?.balance],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar
        backgroundColor={ChatTheme.heroStart}
        barStyle="light-content"
        translucent={false}
      />
      <View style={styles.container}>
        <ChatWelcomeOfferModal
          visible={showWelcomeOffer}
          onStart={dismissWelcomeOffer}
        />
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={ChatTheme.goldDeep} size="large" />
            <Text style={styles.loadingText}>Finding females…</Text>
          </View>
        ) : (
          <FlatList
          data={hosts}
          keyExtractor={item => String(item.uid)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          renderItem={({ item }) => {
            const name = String(
              item.profile?.tamilName || item.profile?.name || 'Female',
            );
            const englishName = String(item.profile?.name || '').trim();
            const rawStatus = String(
              item.profile?.status || 'offline',
            ).toLowerCase();
            const status =
              statusTheme[rawStatus as keyof typeof statusTheme] ||
              statusTheme.offline;
            const unreadCount = Math.max(
              0,
              Number(unreadCounts[String(item.uid)] || 0),
            );
            return (
              <TouchableOpacity
                activeOpacity={0.86}
                style={[
                  styles.card,
                  rawStatus === 'online' && styles.onlineCard,
                ]}
                onPress={() =>
                  navigation.navigate('ChatConversation', { host: item })
                }
              >
                <View style={styles.avatarWrap}>
                  <Image
                    source={getFemaleAvatar(item.profile?.avatarId)}
                    style={styles.avatar}
                  />
                  <View style={styles.presenceRing}>
                    <View
                      style={[
                        styles.presenceDot,
                        { backgroundColor: status.color },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.hostInfo}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  {englishName && englishName !== name ? (
                    <Text style={styles.englishName} numberOfLines={1}>
                      {englishName}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: status.surface },
                    ]}
                  >
                    <View
                      style={[
                        styles.miniDot,
                        { backgroundColor: status.color },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                {unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                ) : null}
                <LinearGradient
                  colors={[ChatTheme.goldLight, ChatTheme.goldDeep]}
                  style={styles.chatAction}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={22}
                    color={Colors.primary}
                  />
                </LinearGradient>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={34}
                  color={Colors.coinHighlight}
                />
              </View>
              <Text style={styles.emptyTitle}>No females available</Text>
              <Text style={styles.emptyText}>
                Please check again in a little while.
              </Text>
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
  list: { paddingBottom: 115, flexGrow: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: Colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBrand: { height: 42, justifyContent: 'center' },
  eyebrow: {
    color: ChatTheme.goldLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  heroMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 19,
    backgroundColor: ChatTheme.heroPanel,
    borderWidth: 1,
    borderColor: ChatTheme.heroPanelBorder,
    borderRadius: 20,
    padding: 13,
  },
  heroIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.overlayBlack45,
    marginRight: 12,
  },
  title: {
    flex: 1,
    color: Colors.white,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  wallet: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlayWhite15,
    paddingHorizontal: 10,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Colors.overlayGold18,
  },
  walletCoin: { width: 21, height: 21 },
  walletBalance: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
    marginHorizontal: 7,
  },
  walletPlus: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.goldLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 20,
    marginBottom: 13,
  },
  hostCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ChatTheme.warmCard,
    borderWidth: 1,
    borderColor: Colors.coinBorder,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.onlineStatus,
    marginRight: 7,
  },
  hostCountText: { color: Colors.text, fontSize: 11, fontWeight: '800' },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successStrongSurface,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  secureText: { color: Colors.successStrong, fontSize: 10, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ChatTheme.warmCard,
    borderRadius: 22,
    padding: 13,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ChatTheme.warmBorder,
    elevation: 3,
    shadowColor: ChatTheme.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  onlineCard: {
    borderColor: ChatTheme.onlineBorder,
    backgroundColor: ChatTheme.warmOnline,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 61,
    height: 61,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: ChatTheme.avatarBorder,
  },
  presenceRing: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  presenceDot: { width: 12, height: 12, borderRadius: 6 },
  hostInfo: { flex: 1, marginLeft: 12, alignItems: 'flex-start' },
  name: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
    maxWidth: '100%',
  },
  englishName: { color: Colors.subText, fontSize: 11, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 9, fontWeight: '800' },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.blueAction,
    paddingHorizontal: 6,
    marginLeft: 5,
  },
  unreadText: { color: Colors.white, fontSize: 10, fontWeight: '900' },
  chatAction: {
    width: 45,
    height: 45,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 9,
    elevation: 3,
    shadowColor: ChatTheme.goldDeep,
    shadowOpacity: 0.3,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.subText, fontSize: 12, marginTop: 12 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: ChatTheme.warmCard,
    borderRadius: 20,
    marginHorizontal: 16,
    paddingVertical: 38,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.coinBorder,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.coinSurface,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 14,
  },
  emptyText: { color: Colors.subText, fontSize: 12, marginTop: 5 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorStrongSurface,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: Colors.danger, fontSize: 12, marginLeft: 8 },
});

export default ChatHostsScreen;
