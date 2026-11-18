import { Text } from '../../localization/components';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  View,
  ActivityIndicator,
  DeviceEventEmitter,
  AppState,
  Text as NativeText,
} from 'react-native';
import { scopedDatabase as database } from '../../firebase/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from './Header';
import Banner from './Banner';
import UserCard from './UserCard';

import Colors from '../../constants/colors';
import UI from '../../constants/ui';
import { useCallBalanceGuard } from '../../hooks/useCallBalanceGuard';
import { useUser } from '../../hooks/UserContext';
import SignupOfferModal from './SignupOfferModal';
import {
  claimSignupOffer,
  DEFAULT_SIGNUP_OFFER_CONFIG,
  listenSignupOffer,
  SignupOfferConfig,
} from '../../firebase/signupOffer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { copy } from '../../constants/strings';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GuestLoginModal from './GuestLoginModal';
import { trackFirstCallOfferApplied } from '../../firebase/analytics';
import type { CallFollowUpIntent } from '../../types/callFollowUp';
import { CALL_RECHARGE_PROMPT_EVENT } from '../../utils/callRechargePrompt';
import { buildExpertBioMap } from '../../utils/expertBios';
import { useHomeBannerMessage } from './useHomeBannerMessage';

const HOME_COLORS = {
  background: Colors.background,
  navy: Colors.textPrimary,
  tealDark: Colors.primary,
  body: Colors.textSecondary,
  white: Colors.surface,
  border: Colors.border,
};

interface Props {
  navigation: any;
  route?: any;
}

const keyExtractor = (item: any) => item?.uid;

const STATUS_PRIORITY: Record<string, number> = {
  online: 0,
  busy: 1,
  offline: 2,
};

const hasCompleteFemaleProfile = (item: any) => {
  const profile = item?.profile;
  const hasName = Boolean(
    String(profile?.tamilName || '').trim() ||
      String(profile?.name || '').trim(),
  );
  return hasName;
};

const HomeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user, refreshUser } = useUser();
  const [femaleUsers, setFemaleUsers] = useState<any[]>([]);
  const [expertsLoaded, setExpertsLoaded] = useState(false);
  const randomCalling = false;
  const callingUserId: string | null = null;
  const [loginVisible, setLoginVisible] = useState(false);
  const [guestPendingCall, setGuestPendingCall] = useState<any>(null);
  const [guestDestination, setGuestDestination] = useState<
    'Wallet' | 'ProfileSetting' | null
  >(null);
  const [offer, setOffer] = useState<SignupOfferConfig>({
    ...DEFAULT_SIGNUP_OFFER_CONFIG,
    active: false,
  });
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [claimingOffer, setClaimingOffer] = useState(false);
  const claimingOfferRef = useRef(false);
  const callInProgressRef = useRef(false);
  const pendingCallHandledRef = useRef(false);

  const canStartCall = useCallBalanceGuard(navigation);
  const homeBannerMessage = useHomeBannerMessage();

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      CALL_RECHARGE_PROMPT_EVENT,
      (followUpIntent: CallFollowUpIntent) => {
        const hostName = followUpIntent.hostName || 'aapke expert';
        const isFreeCall = followUpIntent.source === 'free_call_expired';

        Alert.alert(
          isFreeCall
            ? 'Aapke Free Minutes Khatam Ho Gaye'
            : 'Aapka Balance Khatam Ho Gaya',
          `${hostName} se phir baat karne ke liye recharge karo.`,
          [
            {
              text: 'Recharge ₹10',
              onPress: () =>
                navigation.navigate('Wallet', {
                  preferredAmount: 10,
                  autoCheckout: true,
                  followUpIntent,
                }),
            },
            {
              text: 'Dusra Amount Chuno',
              onPress: () =>
                navigation.navigate('Wallet', {
                  preferredAmount: 20,
                  followUpIntent,
                }),
            },
            { text: 'Baad Mein', style: 'cancel' },
          ],
        );
      },
    );

    return () => subscription.remove();
  }, [navigation]);

  useEffect(
    () =>
      listenSignupOffer(nextOffer => {
        setOffer(current => {
          const changed =
            current.active !== nextOffer.active ||
            current.amount !== nextOffer.amount ||
            current.freeMinutes !== nextOffer.freeMinutes;

          if (changed) {
            setOfferDismissed(!nextOffer.active || nextOffer.amount <= 0);
          }
          if (!nextOffer.active || nextOffer.amount <= 0) {
            setOfferDismissed(true);
          }
          return nextOffer;
        });
      }),
    [],
  );

  const offerClaimed = Boolean(user?.offers?.signupOffer?.claimedAt);
  const signedIn = Boolean(auth().currentUser);
  const showOffer =
    (!signedIn || (Boolean(user) && user?.isExpert !== true)) &&
    offer.active &&
    offer.amount > 0 &&
    offer.freeMinutes > 0 &&
    !offerClaimed &&
    !offerDismissed;

  const claimOffer = useCallback(async () => {
    if (claimingOfferRef.current) return;
    claimingOfferRef.current = true;
    try {
      setClaimingOffer(true);
      const claimedOffer = await claimSignupOffer();
      await refreshUser();
      Alert.alert(
        `₹${claimedOffer.amount} Free Balance Mil Gaya`,
        `Available expert chuno aur pehli ${claimedOffer.freeMinutes} ${
          claimedOffer.freeMinutes === 1 ? 'minute' : 'minutes'
        } free.`,
      );
    } catch (error: any) {
      Alert.alert(
        'Offer Nahi Mila',
        error?.message || 'Thodi der baad dobara try karo.',
      );
    } finally {
      claimingOfferRef.current = false;
      setClaimingOffer(false);
    }
  }, [offer.freeMinutes, refreshUser]);

  const handleOfferClaim = useCallback(() => {
    if (!auth().currentUser) {
      setOfferDismissed(true);
      setGuestPendingCall(null);
      setGuestDestination(null);
      setLoginVisible(true);
      return;
    }
    claimOffer();
  }, [claimOffer]);

  useEffect(() => {
    const ref = database()
      .ref('users')
      .orderByChild('isExpert')
      .equalTo(true)
      .limitToFirst(100);

    const listener = ref.on(
      'value',
      snapshot => {
        const users: any[] = [];

        snapshot.forEach(child => {
          const femaleUser = child.val();

          if (hasCompleteFemaleProfile(femaleUser)) {
            users.push(femaleUser);
          }
          return false;
        });
        setFemaleUsers(users);
        setExpertsLoaded(true);
      },
      error => {
        console.warn('Unable to load expert directory:', error);
        setFemaleUsers([]);
        setExpertsLoaded(true);
      },
    );

    return () => {
      ref.off('value', listener);
    };
  }, []);

  const handleCall = useCallback(
    async (item: any) => {
      if (!auth().currentUser) {
        setGuestDestination(null);
        setGuestPendingCall({ uid: item?.uid, profile: item?.profile });
        setLoginVisible(true);
        return;
      }
      if (
        callInProgressRef.current ||
        !canStartCall(Number(item?.profile?.price))
      )
        return;
      callInProgressRef.current = true;
      navigation.navigate('OutgoingCall', {
        user: { ...item.profile, uid: item.uid },
        initiatedAt: Date.now(),
      });
      setTimeout(() => {
        callInProgressRef.current = false;
      }, 500);
    },
    [canStartCall, navigation],
  );

  useEffect(() => {
    let processing = false;
    const consume = async () => {
      if (
        processing ||
        !auth().currentUser ||
        user?.uid !== auth().currentUser?.uid ||
        user?.isExpert === true ||
        AppState.currentState !== 'active'
      )
        return;
      processing = true;
      try {
        const raw = await AsyncStorage.getItem('pendingOnlineHost');
        if (!raw) return;
        await AsyncStorage.removeItem('pendingOnlineHost');
        const pending = JSON.parse(raw);
        if (Date.now() - pending.createdAt > 5 * 60 * 1000) return;
        const snapshot = await database()
          .ref(`users/${pending.hostUid}`)
          .once('value');
        const host = snapshot.val();
        if (!host || host.profile?.status !== 'online') {
          Alert.alert(
            copy.call.timeout,
            'Expert abhi available nahi hai. Thodi der baad try karo.',
          );
          return;
        }
        await handleCall({
          uid: pending.hostUid,
          profile: { ...host.profile, uid: pending.hostUid },
        });
      } finally {
        processing = false;
      }
    };
    consume().catch(console.warn);
    const event = DeviceEventEmitter.addListener(
      'SpeaklyOnlineHostTapped',
      () => consume().catch(console.warn),
    );
    const state = AppState.addEventListener('change', value => {
      if (value === 'active') consume().catch(console.warn);
    });
    return () => {
      event.remove();
      state.remove();
    };
  }, [handleCall, user?.isExpert, user?.uid]);

  const filtered = useMemo(
    () =>
      femaleUsers
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const aStatus = String(a.item?.profile?.status || '').toLowerCase();
          const bStatus = String(b.item?.profile?.status || '').toLowerCase();
          const aPriority = STATUS_PRIORITY[aStatus] ?? STATUS_PRIORITY.offline;
          const bPriority = STATUS_PRIORITY[bStatus] ?? STATUS_PRIORITY.offline;

          return aPriority - bPriority || a.index - b.index;
        })
        .map(({ item }) => item),
    [femaleUsers],
  );
  const expertBios = useMemo(() => buildExpertBioMap(femaleUsers), [femaleUsers]);

  const onRandomCall = useCallback(async () => {
    if (!auth().currentUser) {
      setGuestDestination(null);
      setGuestPendingCall({ random: true });
      setLoginVisible(true);
      return;
    }
    if (callInProgressRef.current) return;

    const candidates = femaleUsers.filter(
      item => item?.profile?.status === 'online',
    );
    if (!candidates.length) {
      Alert.alert(
        'Expert Abhi Offline Hai',
        'Abhi koi expert available nahi hai. Thodi der baad try karo.',
      );
      return;
    }
    await handleCall(candidates[Math.floor(Math.random() * candidates.length)]);
  }, [femaleUsers, handleCall]);

  useEffect(() => {
    const pendingCall = route?.params?.pendingCall;
    if (
      !pendingCall ||
      pendingCallHandledRef.current ||
      !auth().currentUser ||
      !user
    ) {
      return;
    }

    pendingCallHandledRef.current = true;
    navigation.setParams?.({ pendingCall: undefined });
    if (pendingCall.random === true) {
      onRandomCall();
      return;
    }
    if (pendingCall.uid) {
      handleCall({ uid: pendingCall.uid, profile: pendingCall.profile || {} });
    }
  }, [handleCall, navigation, onRandomCall, route?.params?.pendingCall, user]);

  const walletPress = useCallback(() => {
    if (auth().currentUser) {
      navigation.navigate('Wallet');
      return;
    }
    setGuestPendingCall(null);
    setGuestDestination('Wallet');
    setLoginVisible(true);
  }, [navigation]);

  const userProfilePress = useCallback(() => {
    if (auth().currentUser) {
      navigation.navigate('ProfileSetting', { gender: 'male' });
      return;
    }
    setGuestPendingCall(null);
    setGuestDestination('ProfileSetting');
    setLoginVisible(true);
  }, [navigation]);

  const listHeader = useMemo(
    () => (
      <>
        <Header walletPress={walletPress} userProfilePress={userProfilePress} />

        <Banner
          randomCall={onRandomCall}
          calling={randomCalling}
          title={homeBannerMessage.title}
          subtitle={homeBannerMessage.subtitle}
        />

        <View style={styles.sectionHeader}>
          <NativeText style={styles.heading}>Explore Experts</NativeText>
          <NativeText style={styles.sectionSubtitle}>
            Find the right person to talk to.
          </NativeText>
        </View>
      </>
    ),
    [
      homeBannerMessage,
      onRandomCall,
      randomCalling,
      userProfilePress,
      walletPress,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <UserCard
        item={item}
        bio={expertBios.get(String(item?.uid || '')) || ''}
        calling={callingUserId === item.uid}
        onCall={handleCall}
      />
    ),
    [callingUserId, expertBios, handleCall],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar
        backgroundColor={HOME_COLORS.background}
        barStyle="dark-content"
        translucent={false}
      />

      <View pointerEvents="none" style={styles.backgroundArt}>
        <View style={styles.backgroundGlowTop} />
        <View style={styles.backgroundGlowMiddle} />
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={keyExtractor}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {expertsLoaded ? (
              <>
                <View style={styles.emptyIcon}>
                  <MaterialCommunityIcons
                    name="account-voice-off"
                    size={28}
                    color={Colors.secondary}
                  />
                </View>
                <Text style={styles.emptyTitle}>{copy.home.noHosts}</Text>
                <Text style={styles.emptyText}>{copy.home.noHostsHint}</Text>
              </>
            ) : (
              <ActivityIndicator color={Colors.secondary} size="large" />
            )}
          </View>
        }
        renderItem={renderItem}
      />

      <SignupOfferModal
        visible={showOffer}
        claiming={claimingOffer}
        requiresLogin={!signedIn}
        amount={offer.amount}
        freeMinutes={offer.freeMinutes}
        onClaim={handleOfferClaim}
        onDismiss={() => setOfferDismissed(true)}
      />

      <GuestLoginModal
        visible={loginVisible}
        hostName={String(
          guestPendingCall?.profile?.tamilName ||
            guestPendingCall?.profile?.name ||
            '',
        ).trim()}
        onOpenTerms={() => {
          setLoginVisible(false);
          navigation.navigate('TermsAndConditions');
        }}
        onOpenPrivacy={() => {
          setLoginVisible(false);
          navigation.navigate('PrivacyPolicy');
        }}
        onClose={() => {
          setLoginVisible(false);
          setGuestPendingCall(null);
          setGuestDestination(null);
        }}
        onAuthenticated={async isExpert => {
          let creditedBonus = 0;
          if (!isExpert && !offerClaimed && offer.active && offer.amount > 0) {
            try {
              const claimedOffer = await claimSignupOffer();
              creditedBonus = claimedOffer.amount;
              trackFirstCallOfferApplied(claimedOffer.amount);
            } catch (error) {
              // Existing users may already have claimed the offer. Authentication
              // and the pending call should continue even if the claim is stale.
              if (__DEV__) {
                console.warn('Unable to auto-apply first-call offer:', error);
              }
            }
          }
          setLoginVisible(false);
          await refreshUser();
          const learnerRoutes: any[] = [
            { name: 'Main', params: { pendingCall: guestPendingCall } },
          ];
          if (guestDestination === 'Wallet') {
            learnerRoutes.push({ name: 'Wallet' });
          } else if (guestDestination === 'ProfileSetting') {
            learnerRoutes.push({
              name: 'ProfileSetting',
              params: { gender: 'male' },
            });
          }
          navigation.reset({
            index: isExpert ? 0 : learnerRoutes.length - 1,
            routes: [
              ...(isExpert ? [{ name: 'FemaleBottomTabs' }] : learnerRoutes),
            ],
          });
          if (creditedBonus > 0) {
            setTimeout(() => {
              Alert.alert(
                `₹${creditedBonus} add ho gaye!`,
                'Free call balance ready hai. Expert chuno aur pehli baat shuru karo.',
                [{ text: 'Abhi Baat Karo' }],
              );
            }, 350);
          }
        }}
        offerActive={offer.active}
        offerAmount={offer.amount}
        offerFreeMinutes={offer.freeMinutes}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HOME_COLORS.background,
  },
  backgroundArt: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: 210,
    right: -180,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: 'rgba(252,229,235,0.42)',
  },
  backgroundGlowMiddle: {
    position: 'absolute',
    top: 480,
    left: -220,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: 'rgba(255,229,237,0.48)',
  },
  list: {
    flex: 1,
  },
  heading: {
    fontSize: 21,
    lineHeight: 28,
    paddingTop: 2,
    fontWeight: '900',
    color: HOME_COLORS.navy,
    letterSpacing: -0.7,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionSubtitle: {
    marginTop: 3,
    color: HOME_COLORS.body,
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 1,
  },

  listContent: {
    paddingBottom: 120,
  },

  emptyState: {
    marginHorizontal: UI.spacing.lg,
    marginTop: 18,
    minHeight: 190,
    borderRadius: UI.radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: Colors.screenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 14,
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 6,
    color: Colors.subText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 22,

    padding: 16,

    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 5,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 20,
  },

  info: {
    flex: 1,
    marginLeft: 16,
  },

  name: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
  },

  sub: {
    marginTop: 4,
    color: Colors.subText,
    fontSize: 14,
  },

  onlineRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.presenceGreen,
  },

  online: {
    marginLeft: 6,
    color: Colors.presenceGreen,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  price: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.secondary,
  },

  minute: {
    fontSize: 14,
    color: Colors.subText,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  rating: {
    marginLeft: 6,
    color: Colors.text,
    fontWeight: '600',
  },
});

export default HomeScreen;
