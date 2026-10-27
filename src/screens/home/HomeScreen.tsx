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
} from 'react-native';
import { scopedDatabase as database } from '../../firebase/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from './Header';
import Banner from './Banner';
import CategoryList from './CategoryList';
import UserCard from './UserCard';

import Colors from '../../constants/colors';
import { categories } from '../../constants/dummyData';
import { useCallBalanceGuard } from '../../hooks/useCallBalanceGuard';
import RoomService from '../../firebase/RoomService';
import { useFirstCallReview } from '../../hooks/useFirstCallReview';
import { useUser } from '../../hooks/UserContext';
import SignupOfferModal from './SignupOfferModal';
import {
  claimSignupOffer,
  listenSignupOffer,
  SignupOfferConfig,
} from '../../firebase/signupOffer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  navigation: any;
}

const keyExtractor = (item: any) => item?.uid;

const hasCompleteFemaleProfile = (item: any) => {
  const profile = item?.profile;
  const hasName = Boolean(
    String(profile?.tamilName || '').trim() ||
      String(profile?.name || '').trim(),
  );
  return hasName;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  useFirstCallReview();
  const { user } = useUser();
  const [selected, setSelected] = useState('All');
  const [femaleUsers, setFemaleUsers] = useState<any[]>([]);
  const [expertsLoaded, setExpertsLoaded] = useState(false);
  const [randomCalling, setRandomCalling] = useState(false);
  const [callingUserId, setCallingUserId] = useState<string | null>(null);
  const [offer, setOffer] = useState<SignupOfferConfig>({
    active: false,
    amount: 0,
  });
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [claimingOffer, setClaimingOffer] = useState(false);
  const claimingOfferRef = useRef(false);
  const callInProgressRef = useRef(false);

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
  const showOffer =
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
      const creditedAmount = await claimSignupOffer();
      Alert.alert(
        'Offer Claimed',
        `${creditedAmount} coins were added to your wallet.`,
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

  useEffect(() => {
    const ref = database().ref('users').orderByChild('isExpert').equalTo(true);

    const listener = ref.on('value', snapshot => {
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
    });

    return () => {
      ref.off('value', listener);
    };
  }, []);

  const handleCall = useCallback(
    async (item: any) => {
      if (callInProgressRef.current || !canStartCall()) {
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

  const filtered = useMemo(
    () =>
      selected === 'All'
        ? femaleUsers
        : femaleUsers.filter(item => item.profile?.category === selected),
    [femaleUsers, selected],
  );

  const onRandomCall = useCallback(async () => {
    if (callInProgressRef.current || !canStartCall()) {
      return;
    }

    callInProgressRef.current = true;

    try {
      setRandomCalling(true);
      const randomRoom = await RoomService.getRandomFemaleRoom();

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

  const walletPress = useCallback(
    () => navigation.navigate('Wallet'),
    [navigation],
  );

  const userProfilePress = useCallback(
    () => navigation.navigate('ProfileSetting', { gender: 'male' }),
    [navigation],
  );

  const listHeader = useMemo(
    () => (
      <>
        <Header walletPress={walletPress} userProfilePress={userProfilePress} />

        <Banner randomCall={onRandomCall} calling={randomCalling} />

        <Text style={styles.eyebrow}>CHOOSE YOUR CONVERSATION</Text>
        <Text style={styles.heading}>Experts ready to talk</Text>

        <CategoryList
          categories={categories}
          selected={selected}
          onSelect={setSelected}
        />
      </>
    ),
    [onRandomCall, randomCalling, selected, userProfilePress, walletPress],
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
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar
        backgroundColor={Colors.background}
        barStyle="dark-content"
        translucent={false}
      />

      <FlatList
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
                <Text style={styles.emptyTitle}>No experts here yet</Text>
                <Text style={styles.emptyText}>
                  Try another topic or check back in a little while.
                </Text>
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
        amount={offer.amount}
        claiming={claimingOffer}
        onClaim={claimOffer}
        onDismiss={() => setOfferDismissed(true)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginHorizontal: 18,
    marginTop: 3,
    marginBottom: 14,
    letterSpacing: -0.5,
  },

  eyebrow: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginHorizontal: 18,
    marginTop: 24,
  },

  listContent: {
    paddingBottom: 120,
  },

  emptyState: {
    marginHorizontal: 18,
    marginTop: 18,
    minHeight: 190,
    borderRadius: 22,
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
