import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Alert,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';
import { Avatar, femaleAvatars } from '../constants/constants';
import authData from '../firebase/authData';

interface Props {
  navigation: any;
}

const AvatarScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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
        data={femaleAvatars}
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
        title={loading ? 'Please wait...' : 'Proceed'}
        disabled={!selectedAvatar || loading}
        onPress={async () => {
          if (!selectedAvatar || loading) {
            return;
          }

          setLoading(true);

          try {
            await authData.updateProfile({
              avatarId: selectedAvatar,
            });

            navigation.navigate('AudioVerification', {
              avatarId: selectedAvatar,
            });
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Unable to update avatar.');
          } finally {
            setLoading(false);
          }
        }}
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
