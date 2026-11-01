import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';
import { Avatar, femaleAvatars, maleAvatars } from '../constants/constants';
import { useUser } from '../hooks/UserContext';

interface Props {
  navigation: any;
  route: any;
}

const AvatarScreen: React.FC<Props> = ({ navigation, route }) => {
  const isEditMode = route?.params?.isEditMode;
  const { user, updateProfile } = useUser();
  const gender = String(
    route?.params?.gender || user?.profile?.gender || 'male',
  ).toLowerCase();
  const avatars = gender === 'female' ? femaleAvatars : maleAvatars;
  const selectedAvatarId = Number(user?.profile?.avatarId) || 1;

  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(
    selectedAvatarId,
  );
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
        data={avatars}
        renderItem={renderAvatar}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
      />

      <GradientButton
        style={styles.actionButton}
        title={loading ? 'Please wait...' : isEditMode ? 'Save' : 'Proceed'}
        disabled={!selectedAvatar || loading}
        onPress={async () => {
          if (!selectedAvatar || loading) {
            return;
          }

          setLoading(true);

          try {
            await updateProfile({
              avatarId: selectedAvatar,
              avatarSelected: true,
            });
            if (isEditMode) {
              navigation.goBack();
            } else {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: user?.isExpert === true ? 'FemaleBottomTabs' : 'Main',
                  },
                ],
              });
            }
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
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',

    borderRadius: 72.5,

    overflow: 'hidden',

    backgroundColor: Colors.lightGray,
  },

  backButton: {
    width: 40,
    height: 40,
    marginVertical: 15,
    justifyContent: 'center',
  },

  back: {
    fontSize: 42,
    color: Colors.darkBackground,
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

  actionButton: {
    marginBottom: 25,
    marginTop: 10,
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
    borderColor: Colors.neutralGray,

    position: 'relative',
  },

  selectedAvatar: {
    borderColor: Colors.blueLink,
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

    backgroundColor: Colors.blueLink,

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 3,
    borderColor: Colors.white,

    zIndex: 999,
  },

  check: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
