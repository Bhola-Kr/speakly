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
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { scopedDatabase as database } from '../../firebase/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from './Header';
import Banner from './Banner';
import CategoryList from './CategoryList';
import UserCard from './UserCard';

import Colors from '../../constants/colors';
import UI from '../../constants/ui';
import { categories } from '../../constants/dummyData';
import { useCallBalanceGuard } from '../../hooks/useCallBalanceGuard';
import RoomService from '../../firebase/RoomService';
import { useFirstCallRechargePrompt } from '../../hooks/useFirstCallRechargePrompt';
import { useUser } from '../../hooks/UserContext';
import SignupOfferModal from './SignupOfferModal';
import {
  claimSignupOffer,
  listenSignupOffer,
  SignupOfferConfig,
} from '../../firebase/signupOffer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { copy } from '../../constants/strings';
import auth from '@react-native-firebase/auth';
import GuestLoginModal from './GuestLoginModal';
import { isAnonymousProfileName } from '../../utils/profileValidation';
import { trackFirstCallOfferApplied } from '../../firebase/analytics';

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
  useFirstCallRechargePrompt(navigation);
  const { user } = useUser();
  const [selected, setSelected] = useState('All');
  const [femaleUsers, setFemaleUsers] = useState<any[]>([]);
  const [expertsLoaded, setExpertsLoaded] = useState(false);
  const [randomCalling, setRandomCalling] = useState(false);
  const [callingUserId, setCallingUserId] = useState<string | null>(null);
  const [loginVisible, setLoginVisible] = useState(false);
  const [guestPendingCall, setGuestPendingCall] = useState<any>(null);
  const [guestDestination, setGuestDestination] = useState<
    'Wallet' | 'ProfileSetting' | null
  >(null);
  const [offer, setOffer] = useState<SignupOfferConfig>({
    active: false,
    amount: 0,
  });
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [claimingOffer, setClaimingOffer] = useState(false);
  const claimingOfferRef = useRef(false);
  const callInProgressRef = useRef(false);
  const pendingCallHandledRef = useRef(false);

  const canStartCall = useCallBalanceGuard(navigation);

  useEffect(
    () =>
      listenSignupOffer(nextOffer => {
        setOffer(current => {
          if (
            current.active !== nextOffer.active ||
            current.amount !== nextOffer.amount
          ) {
            setOfferDismissed(false);
          }
          return nextOffer;
        });
      }),
    [],
  );

  const offerClaimed = Boolean(user?.offers?.signupOffer?.claimedAt);
  const showProfileReminder =
    Boolean(user) &&
    user?.isExpert !== true &&
    isAnonymousProfileName(user?.profile?.name);
  const showOffer =
    Boolean(auth().currentUser && user) &&
    user?.isExpert !== true &&
    offer.active &&
    offer.amount > 0 &&
    !offerClaimed &&
    !offerDismissed;

  const claimOffer = useCallback(async () => {
    if (claimingOfferRef.current) return;
    claimingOfferRef.current = true;
    try {
      setClaimingOffer(true);
      await claimSignupOffer();
      Alert.alert(
        'Offer Claimed',
        'Your first 2 free minutes are ready. Choose a host and start talking.',
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to Claim Offer',
        error?.message || 'Please try again in a moment.',
      );
    } finally {
      claimingOfferRef.current = false;
      setClaimingOffer(false);
    }
  }, []);

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
      ) {
        return;
      }

      callInProgressRef.current = true;

      try {
        setCallingUserId(item.uid);

        const room = await RoomService.callFemale(item.uid);

        navigation.navigate('OutgoingCall', { user: item?.profile, room });
      } catch (error: any) {
        console.log('Call Error:', error);

        Alert.alert(
          'Call Failed',
          error?.message || 'Unable to connect the call. Please try again.',
        );
      } finally {
        setCallingUserId(null);
        callInProgressRef.current = false;
      }
    },
    [canStartCall, navigation],
  );

  const filtered = useMemo(() => {
    const categoryUsers =
      selected === 'All'
        ? femaleUsers
        : femaleUsers.filter(item => {
            const topics = Array.isArray(item.profile?.topics)
              ? item.profile.topics
                  .map((topic: unknown) => String(topic).trim())
                  .filter(Boolean)
              : [];

            return (
              topics.includes(selected) || item.profile?.category === selected
            );
          });

    return categoryUsers
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aStatus = String(a.item?.profile?.status || '').toLowerCase();
        const bStatus = String(b.item?.profile?.status || '').toLowerCase();
        const aPriority = STATUS_PRIORITY[aStatus] ?? STATUS_PRIORITY.offline;
        const bPriority = STATUS_PRIORITY[bStatus] ?? STATUS_PRIORITY.offline;

        return aPriority - bPriority || a.index - b.index;
      })
      .map(({ item }) => item);
  }, [femaleUsers, selected]);

  const onRandomCall = useCallback(async () => {
    if (!auth().currentUser) {
      setGuestDestination(null);
      setGuestPendingCall({ random: true });
      setLoginVisible(true);
      return;
    }
    if (callInProgressRef.current) return;

    callInProgressRef.current = true;

    try {
      setRandomCalling(true);
      const randomRoom = await RoomService.getRandomFemaleRoom();
      if (!canStartCall(Number(randomRoom?.callRatePerMinute))) return;

      await RoomService.callFemale(randomRoom?.female?.uid);

      navigation.navigate('OutgoingCall', {
        user: {
          uid: randomRoom?.female?.uid,
          name: randomRoom?.female?.name,
          tamilName: randomRoom?.female?.tamilName,
          gender: randomRoom?.female?.gender,
          avatarId: randomRoom?.female?.avatarId,
        },
        room: randomRoom,
      });
    } catch (e: any) {
      Alert.alert('Info', e.message);
    } finally {
      setRandomCalling(false);
      callInProgressRef.current = false;
    }
  }, [canStartCall, navigation]);

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

        {showProfileReminder && (
          <TouchableOpacity
            activeOpacity={0.84}
            style={styles.profileReminder}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.profileReminderIcon}>
              <MaterialCommunityIcons
                name="account-edit-outline"
                size={21}
                color={HOME_COLORS.tealDark}
              />
            </View>
            <View style={styles.profileReminderCopy}>
              <Text style={styles.profileReminderTitle}>
                Make this profile yours
              </Text>
              <Text style={styles.profileReminderText} numberOfLines={1}>
                Add your name and choose an avatar.
              </Text>
            </View>
            <Text style={styles.profileReminderAction}>Update</Text>
          </TouchableOpacity>
        )}

        <Banner randomCall={onRandomCall} calling={randomCalling} />

        <View style={styles.sectionHeader}>
          <Text style={styles.heading}>{copy.home.availableHosts}</Text>
          <Text style={styles.sectionHint}>{copy.home.sectionHint}</Text>
        </View>

        <CategoryList
          categories={categories}
          selected={selected}
          onSelect={setSelected}
        />
      </>
    ),
    [
      navigation,
      onRandomCall,
      randomCalling,
      selected,
      showProfileReminder,
      userProfilePress,
      walletPress,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <UserCard
        item={item}
        calling={callingUserId === item.uid}
        onCall={handleCall}
      />
    ),
    [callingUserId, handleCall],
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
          if (!isExpert && !offerClaimed) {
            try {
              const creditedAmount = await claimSignupOffer();
              trackFirstCallOfferApplied(creditedAmount);
            } catch (error) {
              // Existing users may already have claimed the offer. Authentication
              // and the pending call should continue even if the claim is stale.
              if (__DEV__) {
                console.warn('Unable to auto-apply first-call offer:', error);
              }
            }
          }
          setLoginVisible(false);
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
        }}
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
  profileReminder: {
    minHeight: 58,
    marginHorizontal: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HOME_COLORS.white,
  },
  profileReminderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  profileReminderCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  profileReminderTitle: {
    color: HOME_COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  profileReminderText: {
    marginTop: 2,
    color: HOME_COLORS.body,
    fontSize: 12,
  },
  profileReminderAction: {
    marginLeft: 8,
    color: HOME_COLORS.tealDark,
    fontSize: 13,
    fontWeight: '900',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 17,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionHint: {
    color: HOME_COLORS.tealDark,
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 1,
    fontWeight: '700',
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
