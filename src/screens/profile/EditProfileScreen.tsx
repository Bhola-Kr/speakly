import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import GradientButton from '../../components/GradientButton';
import { getUserAvatar } from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';

export const EditProfileScreen = ({ navigation }: any) => {
  const { user, updateProfile } = useUser();

  const profile = user?.profile;

  const gender = profile?.gender || 'male';

  const [loading, setLoading] = useState(false);

  const [nickname, setNickname] = useState(profile?.name || '');

  const validate = () => {
    if (!nickname.trim()) {
      Alert.alert('Validation', 'Please enter nickname.');
      return false;
    }

    if (nickname.trim().length < 2) {
      Alert.alert(
        'Validation',
        'Nickname should contain at least 2 characters.',
      );
      return false;
    }

    return true;
  };

  const onSave = async () => {
    if (!validate()) {
      return;
    }

    try {
      setLoading(true);

      await updateProfile({
        name: nickname.trim(),
      });

      Alert.alert('Success', 'Profile updated successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={27}
              color={Colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.avatarContainer}
            onPress={() =>
              navigation.navigate('Avatar', {
                isEditMode: true,
                gender,
                selectedAvatar: profile?.avatarId,
              })
            }
          >
            <Image source={getUserAvatar(user)} style={styles.avatar} />

            <View style={styles.cameraView}>
              <MaterialCommunityIcons
                name="camera"
                size={18}
                color={Colors.white}
              />
            </View>
          </TouchableOpacity>

          <Text style={styles.changePhoto}>Tap to Change Avatar</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Nickname</Text>

          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="Nickname"
            placeholderTextColor={Colors.placeholder}
            style={styles.input}
            maxLength={20}
          />
        </View>
        <View style={styles.spacer} />

        <GradientButton
          title="Save Changes"
          loading={loading}
          onPress={onSave}
        />

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },

  headerTitle: {
    marginLeft: 18,
    color: Colors.text,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  profileCard: {
    paddingVertical: 24,
    borderRadius: 28,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  formCard: {
    marginTop: 22,
    padding: 20,
    paddingBottom: 0,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  spacer: {
    height: 30,
  },

  avatarContainer: {
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 10,
  },

  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: Colors.secondary,
  },

  cameraView: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },

  changePhoto: {
    textAlign: 'center',
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 0,
  },

  label: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 0,
  },

  input: {
    height: 56,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 18,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
});
