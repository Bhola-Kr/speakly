import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, StyleSheet } from 'react-native';
import database from '@react-native-firebase/database';
import { SafeAreaView, FlatList, StatusBar, Text } from 'react-native';

import Header from './Header';
import Banner from './Banner';
import CategoryList from './CategoryList';
import UserCard from './UserCard';

import Colors from '../../constants/colors';
import { categories } from '../../constants/dummyData';
import { useCallBalanceGuard } from '../../hooks/useCallBalanceGuard';
import RoomService from '../../firebase/RoomService';

interface Props {
  navigation: any;
}

const keyExtractor = (item: any) => item?.uid;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [selected, setSelected] = useState('All');
  const [femaleUsers, setFemaleUsers] = useState<any[]>([]);
  const [randomCalling, setRandomCalling] = useState(false);
  const [callingUserId, setCallingUserId] = useState<string | null>(null);
  const callInProgressRef = useRef(false);
  const canStartCall = useCallBalanceGuard(navigation);

  useEffect(() => {
    const ref = database()
      .ref('users')
      .orderByChild('profile/gender')
      .equalTo('female');

    const listener = ref.on('value', snapshot => {
      const users: any[] = [];

      snapshot.forEach(child => {
        users.push(child.val());
      });

      setFemaleUsers(users);
    });

    return () => ref.off('value', listener);
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

        <Text style={styles.heading}>Featured Experts</Text>

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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={keyExtractor}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
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
    fontSize: 20,
    fontWeight: '500',
    color: Colors.text,
    marginHorizontal: 20,
    marginVertical: 12,
  },

  listContent: {
    paddingBottom: 120,
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
