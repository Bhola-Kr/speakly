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

interface Props {
  navigation: any;
  route: any;
}

const NicknameScreen: React.FC<Props> = ({ navigation, route }) => {
  const gender = route.params.gender;
  const [nickname, setNickname] = useState('');

  const [loading, setLoading] = useState(false);

  const isValid = nickname.trim().length >= 3;

  const saveUser = async () => {
    if (!isValid || loading) {
      return;
    }

    try {
      setLoading(true);

      await authData.updateProfile({
        name: nickname,
      });

      if (gender === 'male') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }], // Home Screen
        });
      } else {
        navigation.navigate('BirthYear');
      }
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
        style={{ flex: 1 }}
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
                onChangeText={setNickname}
                placeholder="Enter your Nickname"
                placeholderTextColor={Colors.placeholder}
                autoCapitalize="words"
                returnKeyType="done"
                style={styles.input}
              />
            </View>
          </LinearGradient>

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
});

export default NicknameScreen;
