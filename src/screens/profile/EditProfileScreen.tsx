import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import GradientButton from '../../components/GradientButton';
import { femaleAvatars } from '../../constants/constants';

export const EditProfileScreen = ({ navigation }: any) => {
  const [avatarId, setAvatarId] = useState(1);

  const [nickname, setNickname] = useState('Aadhilakshmi');

  const [day, setDay] = useState('18');

  const [month, setMonth] = useState('07');

  const [year, setYear] = useState('1998');

  const [loading, setLoading] = useState(false);

  const avatar = useMemo(() => {
    return femaleAvatars.find(item => item.id === avatarId) || femaleAvatars[0];
  }, [avatarId]);

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

    if (!day || !month || !year) {
      Alert.alert('Validation', 'Please enter your birthday.');
      return false;
    }

    const dd = Number(day);
    const mm = Number(month);
    const yyyy = Number(year);

    if (dd < 1 || dd > 31) {
      Alert.alert('Validation', 'Invalid day.');
      return false;
    }

    if (mm < 1 || mm > 12) {
      Alert.alert('Validation', 'Invalid month.');
      return false;
    }

    if (yyyy < 1950 || yyyy > new Date().getFullYear()) {
      Alert.alert('Validation', 'Invalid year.');
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

      /**
       * API Call Here
       */

      setTimeout(() => {
        setLoading(false);

        Alert.alert('Success', 'Profile updated successfully.', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }, 1000);
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.avatarContainer}
          onPress={() =>
            navigation.navigate('AvatarSelection', {
              selectedAvatar: avatarId,
              onSelect: (id: number) => setAvatarId(id),
            })
          }
        >
          <Image source={avatar.image} style={styles.avatar} />

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

        <Text style={styles.label}>Birthday</Text>

        <View style={styles.birthRow}>
          <TextInput
            value={day}
            onChangeText={setDay}
            style={styles.birthInput}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="DD"
            placeholderTextColor={Colors.placeholder}
          />

          <TextInput
            value={month}
            onChangeText={setMonth}
            style={styles.birthInput}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="MM"
            placeholderTextColor={Colors.placeholder}
          />

          <TextInput
            value={year}
            onChangeText={setYear}
            style={[styles.birthInput, { flex: 1.5 }]}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="YYYY"
            placeholderTextColor={Colors.placeholder}
          />
        </View>

        <View style={{ height: 40 }} />

        <GradientButton
          title="Save Changes"
          loading={loading}
          onPress={onSave}
        />
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
    paddingBottom: 40,
  },

  header: {
    height: 60,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 20,
  },

  title: {
    fontSize: 26,

    fontWeight: '700',

    color: Colors.text,
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

    marginBottom: 10,

    marginTop: 5,
  },

  input: {
    height: 56,

    backgroundColor: Colors.card,

    borderRadius: 16,

    paddingHorizontal: 18,

    color: Colors.text,

    fontSize: 16,

    borderWidth: 1,

    borderColor: Colors.border,

    marginBottom: 22,
  },

  birthRow: {
    flexDirection: 'row',

    justifyContent: 'space-between',
  },

  birthInput: {
    flex: 1,

    height: 56,

    backgroundColor: Colors.card,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: Colors.border,

    textAlign: 'center',

    color: Colors.text,

    fontSize: 16,

    marginRight: 10,
  },
});
