import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  FlatList,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';
import authData from '../firebase/authData';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Avatar, femaleAvatars, maleAvatars } from '../constants/constants';
import {
  hasValidUsername,
  MIN_USERNAME_LENGTH,
} from '../utils/profileValidation';

type Gender = 'male' | 'female';

interface Props {
  navigation: any;
  route: any;
}

const GenderScreen: React.FC<Props> = ({ navigation, route }) => {
  const user = route.params.user;
  const existingProfile = route.params?.existingProfile;
  const selectedRole: 'learner' | 'expert' =
    route.params?.role === 'expert' ? 'expert' : 'learner';
  const selectedLanguage = String(route.params?.language || 'English');
  const selectedLanguages: string[] = Array.isArray(route.params?.languages)
    ? route.params.languages.map((item: unknown) => String(item)).filter(Boolean)
    : [selectedLanguage];

  const [gender, setGender] = useState<Gender>(
    existingProfile?.gender === 'female' ? 'female' : 'male',
  );
  const [nickname, setNickname] = useState(String(existingProfile?.name || ''));
  const [selectedAvatar, setSelectedAvatar] = useState(
    Number(existingProfile?.avatarId) || 1,
  );
  const [loading, setLoading] = useState(false);
  const avatars = gender === 'female' ? femaleAvatars : maleAvatars;

  const completeProfile = async () => {
    if (loading) {
      return;
    }

    try {
      if (!hasValidUsername(nickname)) {
        Alert.alert(
          'Enter a nickname',
          `Use at least ${MIN_USERNAME_LENGTH} letters for your nickname.`,
        );
        return;
      }

      setLoading(true);
      await authData.createUser(user, gender, selectedRole, selectedLanguage);
      await authData.updateProfile({
        gender,
        name: nickname.trim(),
        avatarId: selectedAvatar,
        avatarSelected: true,
        role: selectedRole,
        practiceLanguage: selectedLanguage,
        nativeLanguage: selectedLanguage,
        supportedLanguages:
          selectedRole === 'expert' ? selectedLanguages : [selectedLanguage],
      });

      if (selectedRole === 'expert') {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'AudioVerification',
              params: {
                language: selectedLanguages[0] || selectedLanguage,
                languages: selectedLanguages,
              },
            },
          ],
        });
        return;
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to save your choice.');
    } finally {
      setLoading(false);
    }
  };

  const selectGender = (nextGender: Gender) => {
    setGender(nextGender);
    setSelectedAvatar(1);
  };

  const renderCard = (
    type: Gender,
    icon: string,
    title: string,
    subtitle?: string,
  ) => {
    const selected = gender === type;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, selected && styles.selectedCard]}
        onPress={() => selectGender(type)}
        accessibilityRole="radio"
        accessibilityLabel={title}
        accessibilityState={{ selected }}
      >
        {selected && (
          <View style={styles.checkContainer}>
            <Text style={styles.check}>✓</Text>
          </View>
        )}

        <View style={[styles.roleIcon, selected && styles.selectedRoleIcon]}>
          <MaterialCommunityIcons
            name={icon}
            size={30}
            color={selected ? Colors.white : Colors.tealDark}
          />
        </View>

        <Text style={styles.genderText}>{title}</Text>

        {subtitle ? <Text style={styles.subTitle}>{subtitle}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.step}>STEP 3 OF 3</Text>

          <Text style={styles.title}>Create your profile</Text>

          <Text style={styles.smallTitle}>
            Choose your gender, nickname and avatar.
          </Text>
        </View>

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {renderCard('male', 'gender-male', 'Male')}
          {renderCard('female', 'gender-female', 'Female')}
        </View>

        <Text style={styles.label}>Nickname</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="What should we call you?"
          placeholderTextColor={Colors.placeholder}
          autoCapitalize="words"
          maxLength={20}
          style={styles.input}
        />

        <Text style={styles.label}>Choose an avatar</Text>
        <FlatList
          horizontal
          data={avatars}
          key={gender}
          keyExtractor={(item: Avatar) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.avatarList}
          renderItem={({ item }: { item: Avatar }) => {
            const selected = selectedAvatar === item.id;
            return (
              <TouchableOpacity
                onPress={() => setSelectedAvatar(item.id)}
                style={[styles.avatarButton, selected && styles.selectedAvatar]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Image source={item.image} style={styles.avatar} />
                {selected && (
                  <View style={styles.avatarCheck}>
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={Colors.white}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        <Text style={styles.note}>
          Speakly is for language practice—not dating or matchmaking.
        </Text>

        <GradientButton
          style={styles.actionButton}
          title={loading ? 'Creating profile...' : 'Start Speaking'}
          disabled={loading || !hasValidUsername(nickname)}
          onPress={completeProfile}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default GenderScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
  },

  header: {
    marginTop: 24,
    marginBottom: 24,
  },

  step: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  smallTitle: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.subText,
    fontWeight: '400',
  },

  title: {
    marginTop: 5,
    fontSize: 30,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1,
  },

  label: {
    marginTop: 18,
    marginBottom: 10,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },

  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  selectedCard: {
    borderColor: Colors.secondary,
  },

  checkContainer: {
    position: 'absolute',

    right: 7,
    top: 7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.secondary,

    justifyContent: 'center',
    alignItems: 'center',
  },

  check: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  roleIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: Colors.screenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedRoleIcon: {
    backgroundColor: Colors.secondary,
  },

  genderText: {
    marginLeft: 9,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },

  subTitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.subText,
    textAlign: 'center',
    fontWeight: '400',
  },

  input: {
    height: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: 17,
    color: Colors.text,
    fontSize: 16,
  },

  avatarList: {
    paddingVertical: 3,
    paddingRight: 12,
  },

  avatarButton: {
    width: 72,
    height: 72,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.transparent,
    padding: 3,
  },

  selectedAvatar: {
    borderColor: Colors.secondary,
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },

  avatarCheck: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 23,
    height: 23,
    borderRadius: 9,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },

  note: {
    marginTop: 20,
    marginBottom: 4,
    textAlign: 'center',
    color: Colors.subText,
    fontSize: 15,
    fontWeight: '400',
  },

  actionButton: {
    marginBottom: 0,
    marginTop: 0,
  },
});
