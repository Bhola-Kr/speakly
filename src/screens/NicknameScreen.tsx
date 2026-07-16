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
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';

interface Props {
  navigation: any;
}

const NicknameScreen: React.FC<Props> = ({ navigation }) => {
  const [nickname, setNickname] = useState('');

  const isValid = nickname.trim().length >= 3;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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

        {/* Button */}

        <GradientButton
          title="Next"
          disabled={!isValid}
          onPress={() => navigation.navigate('BirthYear')}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  backButton: {
    marginTop: 20,
    marginLeft: 20,
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
    marginTop: 90,
    marginHorizontal: 25,
  },

  smallTitle: {
    fontSize: 24,
    color: '#7D7D7D',
    fontWeight: '400',
  },

  title: {
    marginTop: 8,
    fontSize: 40,
    color: Colors.text,
    fontWeight: '800',
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
    backgroundColor: '#FFF9FF',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  input: {
    fontSize: 20,
    color: Colors.text,
  },
});

export default NicknameScreen;
