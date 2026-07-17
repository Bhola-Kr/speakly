import React, { useEffect, useState } from 'react';
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
  Image,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';

interface Props {
  navigation: any;
  route: any;
}

const OtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const phoneNumber = route?.params?.phone ?? '+91 9069304407';

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);

  const isValid = otp.length === 6;

  useEffect(() => {
    if (timer === 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const resendOtp = () => {
    setTimer(30);
    // TODO: Call resend OTP API
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Back */}

        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        {/* Illustration */}

        <Image
          source={require('../assets/otp.png')}
          resizeMode="contain"
          style={styles.image}
        />

        {/* Description */}

        <Text style={styles.description}>
          Your login OTP is sent to{' '}
          <Text style={styles.bold}>{phoneNumber}</Text>
        </Text>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.changeText}>
            Not your number? <Text style={styles.changeLink}>Change here.</Text>
          </Text>
        </TouchableOpacity>

        {/* OTP */}

        <LinearGradient colors={Colors.gradient} style={styles.gradientBorder}>
          <View style={styles.inputContainer}>
            <TextInput
              value={otp}
              onChangeText={text => setOtp(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter OTP"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
            />
          </View>
        </LinearGradient>

        {/* Button */}

        <GradientButton
          title="Proceed"
          disabled={!isValid}
          onPress={() => navigation.navigate('Nickname')}
        />

        {/* Timer */}

        <View style={styles.timerContainer}>
          {timer === 0 ? (
            <TouchableOpacity onPress={resendOtp}>
              <Text style={styles.resend}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Didn't receive an OTP?{' '}
              <Text style={styles.timer}>Resend in {timer} seconds.</Text>
            </Text>
          )}
        </View>
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
    marginTop: -5,
  },

  image: {
    width: 240,
    height: 240,
    alignSelf: 'center',
    marginTop: 30,
    marginBottom: 25,
  },

  description: {
    fontSize: 17,
    color: '#8C8C8C',
    textAlign: 'center',
    marginHorizontal: 30,
    lineHeight: 26,
  },

  bold: {
    color: '#666666',
    fontWeight: '600',
  },

  changeText: {
    marginTop: 5,
    fontSize: 17,
    textAlign: 'center',
    color: '#8C8C8C',
  },

  changeLink: {
    color: '#3E3E3E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  gradientBorder: {
    marginHorizontal: 20,
    marginTop: 45,
    borderRadius: 18,
    padding: 1.5,

    shadowColor: Colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  inputContainer: {
    backgroundColor: '#FFF9FF',
    borderRadius: 17,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  input: {
    fontSize: 22,
    color: Colors.text,
    fontWeight: '600',
    letterSpacing: 1,
  },

  timerContainer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timerText: {
    fontSize: 17,
    color: '#3B3B3B',
  },

  timer: {
    color: '#8D8D8D',
    fontWeight: '500',
  },

  resend: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
  },
});

export default OtpScreen;
