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
        <Image source={item.image} style={styles.avatar} />

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

      <Text style={styles.title}>Select your Avatar</Text>

      <Text style={styles.subtitle}>
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

  backButton: {
    width: 40,
    height: 40,
    marginTop: 12,
    justifyContent: 'center',
  },

  back: {
    fontSize: 42,
    color: '#111',
    fontWeight: '300',
    marginTop: -5,
  },

  title: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },

  subtitle: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
    color: '#808080',
    lineHeight: 25,
    marginBottom: 28,
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

    backgroundColor: '#F4F4F4',

    overflow: 'hidden',

    borderWidth: 2,
    borderColor: 'transparent',
  },

  selectedAvatar: {
    borderColor: '#4D73F8',
  },

  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  checkBadge: {
    position: 'absolute',

    right: 6,
    top: 6,

    width: 28,
    height: 28,

    borderRadius: 14,

    backgroundColor: '#4D73F8',

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  check: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
