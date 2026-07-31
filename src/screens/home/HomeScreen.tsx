import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import database from '@react-native-firebase/database';
import { SafeAreaView, FlatList, StatusBar, Text, View } from 'react-native';

import Header from './Header';
import Banner from './Banner';
import CategoryList from './CategoryList';
import UserCard from './UserCard';

import Colors from '../../constants/colors';
import { categories } from '../../constants/dummyData';
import { useUser } from '../../hooks/UserContext';
import RoomService from '../../firebase/RoomService';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, updateProfile } = useUser();
  const [selected, setSelected] = useState('All');
  const [femaleUsers, setFemaleUsers] = useState<any[]>([]);
  const [calling, setCalling] = useState(false);

  React.useEffect(() => {
    if (user?.profile?.gender?.toLowerCase() === 'male') {
      updateProfile({ status: 'online' });
    }

    const ref = database()
      .ref('users')
      .orderByChild('profile/gender')
      .equalTo('female');

    ref.on('value', snapshot => {
      console.log('Exists:', snapshot.exists());

      const users: any[] = [];

      snapshot.forEach(child => {
        console.log(child.val());
        users.push(child.val());
      });

      console.log('Female Users:', users);

      setFemaleUsers(users);
    });

    return () => ref.off();
  }, []);

  const handleCall = async (item: any) => {
    if (calling) {
      return;
    }

    try {
      setCalling(true);

      const room = await RoomService.callFemale(item.uid);

      navigation.navigate('OutgoingCall', { user: item?.profile, room });
    } catch (error: any) {
      console.log('Call Error:', error);

      Alert.alert(
        'Call Failed',
        error?.message || 'Unable to connect the call. Please try again.',
      );
    } finally {
      setCalling(false);
    }
  };

  const filtered =
    selected === 'All'
      ? femaleUsers
      : femaleUsers.filter(item => item.profile?.category === selected);

  const onRandomCall = async () => {
    if (calling) {
      return;
    }

    try {
      setCalling(true);
      const randomRoom = await RoomService.getRandomFemaleRoom();

      await RoomService.callFemale(randomRoom?.female?.uid);

      navigation.navigate('OutgoingCall', {
        user: {
          uid: randomRoom?.female?.uid,
          name: randomRoom?.female?.name,
          avatarId: randomRoom?.female?.avatarId,
        },
        room: randomRoom,
      });
      setCalling(false);
    } catch (e: any) {
      setCalling(false);
      Alert.alert('Info', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <FlatList
        contentContainerStyle={{ paddingBottom: 120 }}
        data={filtered}
        keyExtractor={item => item?.uid}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Header
              walletPress={() => navigation.navigate('Wallet')}
              userProfilePress={() =>
                navigation.navigate('ProfileSetting', {
                  gender: 'male',
                })
              }
            />

            <Banner randomCall={onRandomCall} calling={calling} />

            <Text style={styles.heading}>Featured Experts</Text>

            <CategoryList
              categories={categories}
              selected={selected}
              onSelect={setSelected}
            />
          </>
        }
        renderItem={({ item }) => (
          <UserCard item={item} callNow={() => handleCall(item)} />
        )}
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

  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 22,

    padding: 16,

    shadowColor: '#000',
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
    backgroundColor: '#16C784',
  },

  online: {
    marginLeft: 6,
    color: '#16C784',
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
