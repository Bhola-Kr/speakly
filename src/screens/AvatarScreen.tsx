import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';

interface Props {
  navigation: any;
}

interface Avatar {
  id: number;
  image: any;
}

const AvatarScreen: React.FC<Props> = ({ navigation }) => {
  const avatars = useMemo<Avatar[]>(
    () => [
      { id: 1, image: require('../assets/avatars/avatar1.png') },
      { id: 2, image: require('../assets/avatars/avatar2.png') },
      { id: 3, image: require('../assets/avatars/avatar3.png') },
      { id: 4, image: require('../assets/avatars/avatar4.png') },
      { id: 5, image: require('../assets/avatars/avatar5.png') },
      { id: 6, image: require('../assets/avatars/avatar6.png') },
      { id: 7, image: require('../assets/avatars/avatar7.png') },
      { id: 8, image: require('../assets/avatars/avatar8.png') },
      { id: 9, image: require('../assets/avatars/avatar9.png') },
      { id: 10, image: require('../assets/avatars/avatar10.png') },
      { id: 11, image: require('../assets/avatars/avatar11.png') },
      { id: 12, image: require('../assets/avatars/avatar12.png') },
      { id: 13, image: require('../assets/avatars/avatar13.png') },
      { id: 14, image: require('../assets/avatars/avatar14.png') },
      { id: 15, image: require('../assets/avatars/avatar15.png') },
      { id: 16, image: require('../assets/avatars/avatar16.png') },
      { id: 17, image: require('../assets/avatars/avatar17.png') },
      { id: 18, image: require('../assets/avatars/avatar18.png') },
      { id: 19, image: require('../assets/avatars/avatar19.png') },
      { id: 20, image: require('../assets/avatars/avatar20.png') },
    ],
    [],
  );

  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);

  const renderAvatar = ({ item }: { item: Avatar }) => {
    const selected = selectedAvatar === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.avatarContainer, selected && styles.selectedAvatar]}
        onPress={() => setSelectedAvatar(item.id)}
      >
        <View style={styles.imageWrapper}>
          <Image source={item.image} style={styles.avatar} />
        </View>

        {selected && (
          <View style={styles.checkBadge}>
            <Text style={styles.check}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      {/* Back */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>

      {/* Header */}

      <Text style={styles.smallTitle}>Select your Avatar</Text>

      <Text style={styles.title}>
        This will be displayed as your profile{'\n'}
        during calls.
      </Text>

      {/* Grid */}

      <FlatList
        data={avatars}
        renderItem={renderAvatar}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
      />

      <GradientButton
        style={{
          marginBottom: 25,
          marginTop: 10,
        }}
        title="Proceed"
        disabled={!selectedAvatar}
        onPress={() => navigation.navigate('NextScreen')}
      />
    </SafeAreaView>
  );
};

export default AvatarScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',

    borderRadius: 72.5,

    overflow: 'hidden',

    backgroundColor: '#F5F5F5',
  },

  backButton: {
    width: 40,
    height: 40,
    marginVertical: 15,
    justifyContent: 'center',
  },

  back: {
    fontSize: 42,
    color: '#111',
    fontWeight: '300',
    marginTop: -5,
  },

  smallTitle: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '400',
  },

  title: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },

  list: {
    paddingBottom: 15,
  },

  row: {
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  avatarContainer: {
    width: 145,
    height: 145,

    borderRadius: 72.5,

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 1,
    borderColor: 'gray',

    position: 'relative',
  },

  selectedAvatar: {
    borderColor: '#4D73F8',
    borderWidth: 3,
  },

  avatar: {
    width: '105%',
    height: '105%',
    resizeMode: 'cover',
  },

  checkBadge: {
    position: 'absolute',

    top: -2,
    right: -2,

    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: '#4D73F8',

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 3,
    borderColor: '#FFFFFF',

    zIndex: 999,
  },

  check: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
