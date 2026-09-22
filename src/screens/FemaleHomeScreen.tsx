import { useActiveCall } from '../hooks/ActiveCallContext';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';

import Colors from '../constants/colors';
import { useUser } from '../hooks/UserContext';
import { getUserAvatar } from '../constants/constants';
import RoomService from '../firebase/RoomService';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 40;

const tutorialData = [
  {
    id: '1',
    title: 'Go Online',
    subtitle:
      'Become available and receive anonymous voice calls from people who want to talk.',
    icon: 'radio',
    colors: [Colors.inkBlue, Colors.slateDark],
  },
  {
    id: '2',
    title: 'Talk Freely',
    subtitle:
      'Enjoy one-on-one conversations without sharing your personal identity.',
    icon: 'chatbubbles',
    colors: [Colors.goldDark, Colors.secondary],
  },
  {
    id: '3',
    title: 'Stay Safe',
    subtitle:
      'Block or report anyone at any time. Your privacy always comes first.',
    icon: 'shield-checkmark',
    colors: [Colors.tealDark, Colors.teal],
  },
  {
    id: '4',
    title: 'Have Fun',
    subtitle:
      'Relax, make new friends, pass the time, and enjoy meaningful voice conversations.',
    icon: 'happy',
    colors: [Colors.purpleDark, Colors.purple],
  },
];

interface Props {
  navigation: any;
}

const FemaleHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { width: windowWidth } = useWindowDimensions();
  const tutorialCardWidth = windowWidth - 50;
  const tutorialSnapWidth = tutorialCardWidth + 10;
  const [page, setPage] = useState(0);
  const [goingOnline, setGoingOnline] = useState(false);

  const isFocused = useIsFocused();

  const { user, updateProfile } = useUser();
  const { activeCall, showCall } = useActiveCall();
  const tamilName = String(user?.profile?.tamilName || '').trim();
  const englishName = String(user?.profile?.name || '').trim();
  const displayName = tamilName || englishName || 'N/A';
  const showEnglishName = Boolean(
    tamilName && englishName && tamilName !== englishName,
  );

  const bannerRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!isFocused || activeCall) {
      return;
    }

    updateProfile({
      status: 'offline',
    });
  }, [isFocused, updateProfile, activeCall]);

  const goOnLine = async () => {
    if (activeCall) {
      showCall();
      return;
    }
    if (goingOnline) {
      return;
    }

    try {
      setGoingOnline(true);
      await RoomService.goOnline();
      navigation.navigate('OnlineRoom');
    } catch (error) {
      console.log('Unable to go online:', error);
      Alert.alert('Unable to Go Online', 'Please try again in a moment.');
    } finally {
      setGoingOnline(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ================= HEADER ================= */}

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good To See You! 👋</Text>

            <Text numberOfLines={1} style={styles.userName}>
              {displayName}
            </Text>

            {showEnglishName && (
              <Text numberOfLines={1} style={styles.userEnglishName}>
                {englishName}
              </Text>
            )}

            <Text style={styles.subtitle}>
              Ready to receive voice calls today?
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ProfileSetting', {
                gender: 'female',
              })
            }
          >
            <Image source={getUserAvatar(user)} style={styles.avatar} />
          </TouchableOpacity>
        </View>

        {/* ================= QUICK TIPS ================= */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Tips</Text>
          </View>

          <FlatList
            ref={bannerRef}
            horizontal
            pagingEnabled
            data={tutorialData}
            contentContainerStyle={{
              paddingHorizontal: 20,
            }}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={tutorialSnapWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={e => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / tutorialSnapWidth,
              );

              setPage(index);
            }}
            renderItem={({ item }) => (
              <LinearGradient
                colors={item.colors}
                style={[styles.tutorialCard, { width: tutorialCardWidth }]}
              >
                <View style={styles.tutorialTop}>
                  <View style={styles.iconCircle}>
                    <Ionicons name={item.icon} size={30} color={Colors.white} />
                  </View>

                  <View style={styles.tipBadge}>
                    <Text style={styles.tipBadgeText}>TIP</Text>
                  </View>
                </View>

                <View>
                  <Text style={styles.cardTitle}>{item.title}</Text>

                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
              </LinearGradient>
            )}
          />

          <View style={styles.indicatorContainer}>
            {tutorialData.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, page === index && styles.activeDot]}
              />
            ))}
          </View>
        </View>

        {/* ================= GO ONLINE ================= */}

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={goOnLine}
          disabled={goingOnline}
        >
          <LinearGradient
            colors={Colors.buttonGradient}
            style={[styles.onlineButton, goingOnline && styles.loadingButton]}
          >
            {goingOnline ? (
              <>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.onlineText}>GOING ONLINE...</Text>
              </>
            ) : (
              <>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>GO ONLINE</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ================= DAILY REMINDER ================= */}

        <LinearGradient
          colors={Colors.goldGradient}
          style={styles.reminderCard}
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <Text style={styles.reminderTitle}>Daily Reminder</Text>

            <Text style={styles.reminderDesc}>
              Go online whenever you're free to meet new people, have
              interesting conversations, and enjoy your time.
            </Text>
          </View>

          <View style={styles.reminderIcon}>
            <Ionicons name="sparkles" size={34} color={Colors.white} />
          </View>
        </LinearGradient>

        {/* ================= ACCOUNT STATUS ================= */}

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicator} />

            <Text style={styles.statusTitle}>Account Status</Text>
          </View>

          <Text style={styles.statusValue}>
            {user?.profile?.status === 'online' ? 'Online' : 'Offline'}
          </Text>

          <Text style={styles.statusDescription}>
            Your profile is currently{' '}
            <Text
              style={{
                fontWeight: '700',
              }}
            >
              {user?.profile?.status === 'online' ? 'visible' : 'hidden'}
            </Text>{' '}
            to users. Tap the "GO ONLINE" button whenever you're ready to
            receive calls.
          </Text>
        </View>

        <View
          style={{
            height: 40,
          }}
        />

        <LinearGradient
          colors={Colors.buttonGradient}
          style={styles.reminderCard}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>Enjoy</Text>

            <Text style={styles.reminderDesc}>
              Connect with people through private voice conversations. Your
              identity stays hidden, making every chat comfortable, safe and
              pressure-free.
            </Text>
          </View>

          <View style={styles.reminderIcon}>
            <Ionicons name="heart" size={34} color={Colors.white} />
          </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  tutorialCard: {
    marginRight: 10,
    borderRadius: 24,
    padding: 22,
  },

  tutorialTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.overlayWhite18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tipBadge: {
    backgroundColor: Colors.overlayWhite18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  tipBadgeText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },

  cardTitle: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: '700',
  },

  cardSubtitle: {
    marginTop: 10,
    color: Colors.overlayWhite90,
    fontSize: 15,
    lineHeight: 22,
  },

  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.disabled,
    marginHorizontal: 4,
  },

  activeDot: {
    width: 24,
    backgroundColor: Colors.secondary,
  },

  onlineButton: {
    height: 62,
    marginHorizontal: 18,
    marginBottom: 22,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  loadingButton: {
    opacity: 0.75,
  },

  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.online,
    marginRight: 12,
  },

  onlineText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 1,
  },

  noticeFooter: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },

  rewardBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },

  reminderCard: {
    marginHorizontal: 18,
    marginBottom: 22,
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },

  reminderTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
  },

  reminderDesc: {
    color: Colors.overlayWhite92,
    marginTop: 10,
    lineHeight: 22,
    fontSize: 15,
  },

  reminderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.overlayWhite15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },

  statusCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 18,
    borderRadius: 24,
    padding: 22,

    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.online,
    marginRight: 10,
  },

  statusTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },

  statusValue: {
    marginTop: 16,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.secondary,
  },

  statusDescription: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.subText,
    lineHeight: 22,
  },

  content: {
    paddingBottom: 120,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 25,
  },

  greeting: {
    fontSize: 16,
    color: Colors.subText,
    fontWeight: '500',
  },

  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },

  userEnglishName: {
    fontSize: 16,
    color: Colors.subText,
    marginTop: 2,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.subText,
    marginTop: 6,
  },

  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notification: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,

    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },

  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 18,
    marginBottom: 22,
    borderRadius: 24,
    paddingVertical: 20,

    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 5,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '700',
  },

  viewAll: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },

  bannerContainer: {
    width: BANNER_WIDTH,
    alignItems: 'center',
  },

  banner: {
    width: BANNER_WIDTH,
    height: 185,
    borderRadius: 22,
    resizeMode: 'cover',
  },

  playButton: {
    position: 'absolute',
    top: 65,

    width: 62,
    height: 62,

    borderRadius: 31,

    backgroundColor: Colors.overlayBlack45,

    justifyContent: 'center',
    alignItems: 'center',
  },

  smallBannerCard: {
    width: 240,
    height: 170,

    marginRight: 16,

    borderRadius: 22,

    overflow: 'hidden',
  },

  smallBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,

    padding: 16,
  },

  bannerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },

  bannerSubtitle: {
    color: Colors.gray238,
    marginTop: 4,
    fontSize: 13,
  },

  noticeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,

    marginHorizontal: 20,
    marginBottom: 18,

    borderRadius: 20,

    overflow: 'hidden',
  },

  noticeImage: {
    width: 110,
    height: 120,
    resizeMode: 'cover',
  },

  noticeContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },

  noticeTitle: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 16,
  },

  noticeDesc: {
    color: Colors.subText,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 20,
  },

  noticeButton: {
    alignSelf: 'flex-start',

    marginTop: 12,

    backgroundColor: Colors.secondary,

    paddingHorizontal: 18,
    paddingVertical: 8,

    borderRadius: 18,
  },

  noticeButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});

export default FemaleHomeScreen;
