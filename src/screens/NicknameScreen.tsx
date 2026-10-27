import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';
import authData from '../firebase/authData';
import {
  hasValidUsername,
  MIN_USERNAME_LENGTH,
} from '../utils/profileValidation';

interface Props {
  navigation: any;
  route: any;
}

const NicknameScreen: React.FC<Props> = ({ navigation, route }) => {
  const gender = route.params.gender;
  const [nickname, setNickname] = useState('');
  const [nicknameTouched, setNicknameTouched] = useState(false);

  const [loading, setLoading] = useState(false);

  const isValid = hasValidUsername(nickname);

  const saveUser = async () => {
    if (loading) {
      return;
    }

    setNicknameTouched(true);

    if (!hasValidUsername(nickname)) {
      Alert.alert(
        'Invalid Username',
        `Use at least ${MIN_USERNAME_LENGTH} characters. Names can contain letters, spaces, apostrophes, periods, and hyphens, but not phone numbers.`,
      );
      return;
    }

    try {
      setLoading(true);

      await authData.updateProfile({
        name: nickname.trim(),
      });

      navigation.navigate('Avatar', { gender });
    } catch (e: any) {
      console.log('Create User Error:', e);

      Alert.alert('Error', e?.message || 'Unable to continue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* Back */}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          {/* Title */}

          <View style={styles.titleContainer}>
            <Text style={styles.smallTitle}>What is your</Text>

            <Text style={styles.title}>Nickname?</Text>
          </View>

          {/* Input */}

          <LinearGradient
            colors={Colors.gradient}
            style={styles.gradientBorder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.inputContainer}>
              <TextInput
                value={nickname}
                onChangeText={value => {
                  setNickname(value);
                  if (!nicknameTouched) setNicknameTouched(true);
                }}
                onBlur={() => setNicknameTouched(true)}
                placeholder="Enter your Nickname"
                placeholderTextColor={Colors.placeholder}
                autoCapitalize="words"
                returnKeyType="done"
                style={styles.input}
                maxLength={20}
              />
            </View>
          </LinearGradient>

          {nicknameTouched && !hasValidUsername(nickname) && (
            <Text style={styles.validationText}>
              Use at least {MIN_USERNAME_LENGTH} letters. Phone numbers and
              numeric characters are not allowed.
            </Text>
          )}

          <GradientButton
            title={loading ? 'Please wait...' : 'Next'}
            disabled={!isValid || loading}
            onPress={saveUser}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  backButton: {
    marginLeft: 18,
    marginTop: 15,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 42,
    color: Colors.black,
    fontWeight: '300',
  },

  titleContainer: {
    marginTop: 50,
    marginHorizontal: 25,
  },

  smallTitle: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '400',
  },

  title: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },

  gradientBorder: {
    marginHorizontal: 25,
    marginTop: 70,
    borderRadius: 18,
    padding: 1.3,
  },

  inputContainer: {
    borderRadius: 17,
    backgroundColor: Colors.otpInputSurface,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  input: {
    fontSize: 20,
    color: Colors.text,
  },

  tamilNameLabel: {
    marginHorizontal: 25,
    marginTop: 24,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  validationText: {
    color: Colors.danger,
    fontSize: 13,
    marginHorizontal: 28,
    marginTop: 8,
  },

  tamilNameBorder: {
    marginTop: 10,
  },
});

export default NicknameScreen;
