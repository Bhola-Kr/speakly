import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { getUserAvatar } from '../constants/constants';
import RoomService from '../firebase/RoomService';
import { useActiveCall } from '../hooks/ActiveCallContext';
import { useUser } from '../hooks/UserContext';
import {
  MIN_EXPERT_WITHDRAWAL_AMOUNT,
  requestExpertWithdrawal,
} from '../firebase/expertEarnings';

const COLORS = {
  background: '#F5FFFD',
  navy: '#071A2D',
  teal: '#08AA91',
  tealDark: '#078A7D',
  tealPale: '#DFF9F4',
  mint: '#BDF4E8',
  body: '#71788E',
  white: '#FFFFFF',
  border: '#DFF0ED',
  coral: '#FF8B66',
  coralPale: '#FFF3EB',
  purple: '#7956F4',
  purplePale: '#F1ECFF',
  online: '#62D957',
  offline: '#A2A8B5',
};

const tutorialData = [
  {
    id: '1',
    title: 'Go Online',
    subtitle:
      'Become available and receive practice calls from language learners.',
    icon: 'radio',
  },
  {
    id: '2',
    title: 'Guide the conversation',
    subtitle:
      'Help learners improve fluency through focused one-to-one conversation.',
    icon: 'chatbubbles',
  },
  {
    id: '3',
    title: 'Stay Safe',
    subtitle:
      'Block or report anyone at any time. Your privacy always comes first.',
    icon: 'shield-checkmark',
  },
  {
    id: '4',
    title: 'Build confidence',
    subtitle:
      'Choose useful topics and create a welcoming language-practice session.',
    icon: 'happy',
  },
];

interface Props {
  navigation: any;
}

const TutorialArtwork = ({ icon, first }: { icon: string; first: boolean }) => {
  if (!first) {
    return (
      <View style={styles.secondaryArtwork}>
        <Ionicons name={icon} size={50} color={COLORS.tealDark} />
      </View>
    );
  }

  return (
    <View style={styles.toggleArtwork}>
      <View style={styles.toggleGlow} />
      <View style={styles.broadcastBubble}>
        <Ionicons name="radio" size={31} color={COLORS.navy} />
      </View>
      <View style={styles.toggleTrack}>
        <View style={styles.toggleKnob} />
      </View>
      <View style={styles.signalOne} />
      <View style={styles.signalTwo} />
      <View style={styles.signalThree} />
    </View>
  );
};

const FemaleHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const tutorialCardWidth = width - 40;
  const [page, setPage] = useState(0);
  const [goingOnline, setGoingOnline] = useState(false);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
  const bannerRef = useRef<FlatList>(null);

  const { user } = useUser();
  const { activeCall, showCall } = useActiveCall();
  const tamilName = String(user?.profile?.tamilName || '').trim();
  const englishName = String(user?.profile?.name || '').trim();
  const displayName = tamilName || englishName || 'Expert';
  const showEnglishName = Boolean(
    tamilName && englishName && tamilName !== englishName,
  );
  const isOnline = user?.profile?.status === 'online';
  const totalEarnings = Number(user?.expertEarnings?.total || 0);
  const availableEarnings = Number(user?.expertEarnings?.available || 0);
  const pendingWithdrawal = user?.expertEarnings?.pendingWithdrawal;

  const requestWithdrawal = async () => {
    if (requestingWithdrawal) return;
    try {
      setRequestingWithdrawal(true);
      const request = await requestExpertWithdrawal();
      Alert.alert(
        'Withdrawal Requested',
        `Your request for ₹${request.amount} has been submitted. The admin will review and process it. During the review, they may contact you on your registered phone number.`,
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to Request Withdrawal',
        error?.message || 'Please try again.',
      );
    } finally {
      setRequestingWithdrawal(false);
    }
  };

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>EXPERT DASHBOARD</Text>
            <Text numberOfLines={1} style={styles.userName}>
              {displayName}
            </Text>
            {showEnglishName && (
              <Text numberOfLines={1} style={styles.userEnglishName}>
                {englishName}
              </Text>
            )}
            <Text style={styles.subtitle}>
              Choose when learners can reach you.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() =>
              navigation.navigate('ProfileSetting', { gender: 'female' })
            }
            style={styles.avatarButton}
          >
            <Image source={getUserAvatar(user)} style={styles.avatar} />
            <View
              style={[
                styles.avatarStatus,
                !isOnline && styles.avatarStatusOffline,
              ]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.tutorialShell}>
          <FlatList
            key={tutorialCardWidth}
            ref={bannerRef}
            horizontal
            pagingEnabled
            data={tutorialData}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={tutorialCardWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={event => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / tutorialCardWidth,
              );
              setPage(index);
            }}
            renderItem={({ item, index }) => (
              <LinearGradient
                colors={['#FFFFFF', '#EEFFFB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.tutorialCard, { width: tutorialCardWidth }]}
              >
                <View style={styles.tipBadge}>
                  <Ionicons
                    name="bulb-outline"
                    size={18}
                    color={COLORS.tealDark}
                  />
                  <Text style={styles.tipBadgeText}>TIP</Text>
                </View>

                <Text style={styles.sectionTitle}>
                  MAKE EVERY SESSION COUNT
                </Text>
                <Text
                  style={[
                    styles.cardTitle,
                    index > 0 && styles.cardTitleSecondary,
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.cardSubtitle,
                    index > 0 && styles.cardSubtitleSecondary,
                  ]}
                >
                  {item.subtitle}
                </Text>

                <TutorialArtwork icon={item.icon} first={index === 0} />
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

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={goOnLine}
          disabled={goingOnline}
          style={styles.onlineButtonTouch}
        >
          <LinearGradient
            colors={['#0B978A', '#08A98F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.onlineButton, goingOnline && styles.loadingButton]}
          >
            {goingOnline ? (
              <>
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text style={styles.onlineText}>Getting you ready…</Text>
              </>
            ) : (
              <>
                <View style={styles.onlineDot} />
                <Ionicons name="call-outline" size={24} color={COLORS.white} />
                <Text style={styles.onlineText}>Start receiving calls</Text>
                <View style={styles.onlineArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={23}
                    color={COLORS.white}
                  />
                </View>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <View>
              <Text style={styles.earningsEyebrow}>YOUR EARNINGS</Text>
              <Text style={styles.earningsTotal}>₹{totalEarnings}</Text>
              <Text style={styles.earningsAvailable}>
                ₹{availableEarnings} available
              </Text>
            </View>
            <View style={styles.earningsIcon}>
              <Ionicons name="wallet-outline" size={30} color={COLORS.tealDark} />
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={
              requestingWithdrawal ||
              availableEarnings < MIN_EXPERT_WITHDRAWAL_AMOUNT ||
              Boolean(pendingWithdrawal?.id)
            }
            onPress={requestWithdrawal}
            style={[
              styles.withdrawButton,
              (availableEarnings < MIN_EXPERT_WITHDRAWAL_AMOUNT ||
                pendingWithdrawal?.id) &&
                styles.withdrawButtonDisabled,
            ]}
          >
            {requestingWithdrawal ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.withdrawButtonText}>
                {pendingWithdrawal?.id
                  ? `Withdrawal pending · ₹${Number(
                      pendingWithdrawal.amount || 0,
                    )}`
                  : 'Request withdrawal'}
              </Text>
            )}
          </TouchableOpacity>
          {!pendingWithdrawal?.id &&
            availableEarnings > 0 &&
            availableEarnings < MIN_EXPERT_WITHDRAWAL_AMOUNT && (
              <Text style={styles.withdrawalMinimum}>
                Minimum withdrawal is ₹{MIN_EXPERT_WITHDRAWAL_AMOUNT}.
              </Text>
            )}
        </View>

        <LinearGradient
          colors={['#FFFDFB', COLORS.coralPale]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.reminderCard}
        >
          <View style={styles.reminderCopy}>
            <Text style={styles.reminderEyebrow}>YOU SET THE PACE</Text>
            <Text style={styles.reminderTitle}>
              Go online only{`\n`}when you’re ready
            </Text>
            <Text style={styles.reminderDesc}>
              Take control of your availability for a focused conversation.
            </Text>
          </View>
          <View style={styles.calendarGlow}>
            <Ionicons name="calendar-outline" size={72} color={COLORS.coral} />
            <View style={styles.clockBadge}>
              <Ionicons name="time" size={22} color={COLORS.coral} />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statusCard}>
          <View style={styles.statusCopy}>
            <View style={styles.statusHeader}>
              <View
                style={[
                  styles.statusIndicator,
                  !isOnline && styles.statusIndicatorOffline,
                ]}
              />
              <Text style={styles.statusTitle}>ACCOUNT STATUS</Text>
            </View>

            <Text
              style={[styles.statusValue, isOnline && styles.statusValueOnline]}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Text>

            <Text style={styles.statusDescription}>
              Learners currently see your profile as{' '}
              <Text style={styles.statusEmphasis}>
                {isOnline ? 'visible' : 'hidden'}
              </Text>
              . Use the button above whenever you're ready to receive calls.
            </Text>
          </View>

          <View style={styles.visibilityIcon}>
            <Ionicons
              name={isOnline ? 'eye-outline' : 'eye-off-outline'}
              size={34}
              color={isOnline ? COLORS.teal : COLORS.purple}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 120,
  },
  header: {
    minHeight: 136,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginHorizontal: 28,
    paddingTop: 18,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    color: COLORS.tealDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.1,
  },
  userName: {
    marginTop: 6,
    color: COLORS.navy,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  userEnglishName: {
    marginTop: 1,
    color: COLORS.body,
    fontSize: 13,
  },
  subtitle: {
    marginTop: 7,
    color: COLORS.body,
    fontSize: 15,
    lineHeight: 21,
  },
  avatarButton: {
    marginTop: -5,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.tealPale,
  },
  avatarStatus: {
    position: 'absolute',
    right: 1,
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: COLORS.online,
  },
  avatarStatusOffline: {
    backgroundColor: COLORS.offline,
  },
  tutorialShell: {
    height: 232,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  tutorialCard: {
    height: 230,
    paddingHorizontal: 30,
    paddingTop: 25,
  },
  sectionTitle: {
    color: COLORS.tealDark,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  cardTitle: {
    width: '57%',
    marginTop: 12,
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  cardSubtitle: {
    width: '56%',
    marginTop: 8,
    color: COLORS.body,
    fontSize: 15,
    lineHeight: 23,
  },
  cardTitleSecondary: {
    width: '61%',
    marginTop: 10,
    fontSize: 25,
    lineHeight: 30,
  },
  cardSubtitleSecondary: {
    width: '62%',
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
  },
  tipBadge: {
    position: 'absolute',
    right: 20,
    top: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  tipBadgeText: {
    marginLeft: 7,
    color: COLORS.tealDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  toggleArtwork: {
    position: 'absolute',
    width: 138,
    height: 140,
    right: 9,
    bottom: 22,
  },
  toggleGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    right: -20,
    bottom: -11,
    borderRadius: 60,
    backgroundColor: 'rgba(176,245,231,0.35)',
  },
  toggleTrack: {
    position: 'absolute',
    right: 0,
    bottom: 18,
    width: 116,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.teal,
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  toggleKnob: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.white,
  },
  broadcastBubble: {
    position: 'absolute',
    left: 0,
    top: 2,
    zIndex: 3,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.mint,
  },
  signalOne: {
    position: 'absolute',
    width: 5,
    height: 24,
    right: 49,
    top: -4,
    borderRadius: 3,
    backgroundColor: '#72E2CE',
    transform: [{ rotate: '10deg' }],
  },
  signalTwo: {
    position: 'absolute',
    width: 5,
    height: 18,
    right: 27,
    top: 3,
    borderRadius: 3,
    backgroundColor: '#72E2CE',
    transform: [{ rotate: '34deg' }],
  },
  signalThree: {
    position: 'absolute',
    width: 5,
    height: 14,
    right: 10,
    top: 19,
    borderRadius: 3,
    backgroundColor: '#72E2CE',
    transform: [{ rotate: '70deg' }],
  },
  secondaryArtwork: {
    position: 'absolute',
    right: 28,
    bottom: 67,
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealPale,
  },
  indicatorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 11,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    marginHorizontal: 5,
    borderRadius: 4,
    backgroundColor: '#DDE2E6',
  },
  activeDot: {
    width: 24,
    backgroundColor: COLORS.tealDark,
  },
  onlineButtonTouch: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 20,
  },
  onlineButton: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.17,
    shadowRadius: 14,
    elevation: 5,
  },
  loadingButton: {
    opacity: 0.78,
  },
  earningsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earningsEyebrow: {
    color: COLORS.tealDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  earningsTotal: {
    marginTop: 6,
    color: COLORS.navy,
    fontSize: 32,
    fontWeight: '900',
  },
  earningsAvailable: { marginTop: 2, color: COLORS.body, fontSize: 14 },
  earningsIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealPale,
  },
  withdrawButton: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealDark,
  },
  withdrawButtonDisabled: { opacity: 0.5 },
  withdrawButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  withdrawalMinimum: {
    marginTop: 8,
    color: COLORS.body,
    fontSize: 12,
    textAlign: 'center',
  },
  onlineDot: {
    width: 11,
    height: 11,
    marginRight: 15,
    borderRadius: 6,
    backgroundColor: COLORS.online,
  },
  onlineText: {
    marginLeft: 11,
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
  },
  onlineArrow: {
    position: 'absolute',
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  reminderCard: {
    minHeight: 180,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 30,
    paddingVertical: 23,
    borderWidth: 1,
    borderColor: '#F9E7DA',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderCopy: {
    flex: 1,
    zIndex: 2,
  },
  reminderEyebrow: {
    color: COLORS.coral,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  reminderTitle: {
    marginTop: 11,
    color: COLORS.navy,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  reminderDesc: {
    marginTop: 7,
    color: COLORS.body,
    fontSize: 14,
    lineHeight: 21,
  },
  calendarGlow: {
    width: 94,
    height: 94,
    marginLeft: -18,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  clockBadge: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    width: 39,
    height: 39,
    borderWidth: 4,
    borderColor: COLORS.coral,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  statusCard: {
    minHeight: 180,
    marginHorizontal: 20,
    paddingHorizontal: 30,
    paddingVertical: 25,
    borderWidth: 1,
    borderColor: '#EEF0F5',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
    elevation: 2,
  },
  statusCopy: {
    flex: 1,
    zIndex: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 11,
    height: 11,
    marginRight: 10,
    borderRadius: 6,
    backgroundColor: COLORS.online,
  },
  statusIndicatorOffline: {
    backgroundColor: COLORS.online,
  },
  statusTitle: {
    color: COLORS.body,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  statusValue: {
    marginTop: 14,
    color: COLORS.purple,
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  statusValueOnline: {
    color: COLORS.teal,
  },
  statusDescription: {
    width: '92%',
    marginTop: 7,
    color: COLORS.body,
    fontSize: 13.5,
    lineHeight: 20,
  },
  statusEmphasis: {
    fontWeight: '800',
  },
  visibilityIcon: {
    width: 76,
    height: 76,
    marginLeft: -30,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purplePale,
  },
});

export default FemaleHomeScreen;
