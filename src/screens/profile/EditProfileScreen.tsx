import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import GradientButton from '../../components/GradientButton';
import { getUserAvatar } from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';

const ITEM_HEIGHT = 40;

export const EditProfileScreen = ({ navigation }: any) => {
  const { user, updateProfile } = useUser();

  const profile = user?.profile;

  const gender = profile?.gender || 'male';

  const years = useMemo(
    () => Array.from({ length: 77 }, (_, i) => 2026 - i),
    [],
  );

  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(false);

  const [nickname, setNickname] = useState(profile?.name || '');

  const [tamilName, setTamilName] = useState(profile?.tamilName || '');

  const [birthYear, setBirthYear] = useState(
    Number(profile?.birthYear) || 2000,
  );

  useEffect(() => {
    const index = years.indexOf(birthYear);

    if (index >= 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: index * ITEM_HEIGHT,
          animated: false,
        });
      }, 150);
    }
  }, [birthYear, years]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    const index = Math.round(offsetY / ITEM_HEIGHT);

    if (years[index]) {
      setBirthYear(years[index]);
    }
  };

  const validate = () => {
    if (gender === 'female' && !nickname.trim()) {
      Alert.alert('Validation', 'Please enter nickname.');
      return false;
    }

    if (gender === 'female' && nickname.trim().length < 2) {
      Alert.alert(
        'Validation',
        'Nickname should contain at least 2 characters.',
      );
      return false;
    }

    if (gender === 'female' && tamilName.trim().length < 2) {
      Alert.alert('Validation', 'Please enter your Tamil name.');
      return false;
    }

    const currentYear = new Date().getFullYear();

    if (birthYear < 1950 || birthYear > currentYear) {
      Alert.alert('Validation', 'Please select a valid birth year.');

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
        ...(gender === 'female'
          ? { name: nickname.trim(), tamilName: tamilName.trim() }
          : {}),
        birthYear,
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

        {gender === 'female' && (
          <>
            <Text style={styles.label}>Nickname</Text>

            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="Nickname"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
              maxLength={20}
            />

            <Text style={styles.label}>Tamil Name</Text>

            <TextInput
              value={tamilName}
              onChangeText={setTamilName}
              placeholder="பெயரை தமிழில் உள்ளிடவும்"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
              maxLength={40}
            />
          </>
        )}

        <Text style={styles.label}>Birth Year</Text>

        <LinearGradient colors={Colors.gradient} style={styles.gradientBorder}>
          <View style={styles.pickerContainer}>
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={onScrollEnd}
              contentContainerStyle={{
                paddingVertical: ITEM_HEIGHT,
              }}
            >
              {years.map(year => (
                <TouchableOpacity
                  key={year}
                  activeOpacity={1}
                  style={styles.item}
                  onPress={() => setBirthYear(year)}
                >
                  <Text
                    style={[
                      styles.yearText,
                      birthYear === year && styles.selectedYear,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </LinearGradient>
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

  gradientBorder: {
    borderRadius: 20,
    padding: 1.5,

    shadowColor: Colors.blueBrandMuted,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  pickerContainer: {
    height: ITEM_HEIGHT * 3,
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: 'hidden',
  },

  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  yearText: {
    fontSize: 18,
    color: Colors.gray190,
  },

  selectedYear: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
});
