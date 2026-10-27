import React, { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
              color={Colors.black}
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.changePhoto}>Tap to Change Avatar</Text>

        <Text style={styles.label}>Nickname</Text>

        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="Nickname"
          placeholderTextColor={Colors.placeholder}
          style={styles.input}
          maxLength={20}
        />
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
    paddingTop: 16,
    paddingBottom: 40,
  },

  spacer: {
    height: 30,
  },

  avatarContainer: {
    alignSelf: 'center',
    marginTop: 10,
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
    marginBottom: 30,
  },

  label: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 6,
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
