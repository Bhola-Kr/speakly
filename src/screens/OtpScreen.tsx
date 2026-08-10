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
  ScrollView,
  Alert,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';
import authData from '../firebase/authData';
import { useUser } from '../hooks/UserContext';
import { OTPWidget } from '@msg91comm/sendotp-react-native';

interface Props {
  navigation: any;
  route: any;
}

const OtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const phoneNumber = route.params.phone;
  const reqId = route.params.reqId;
  console.log('reqId', reqId);
  const { refreshUser } = useUser();

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);

  const isValid = otp.length === 4;

  useEffect(() => {
    if (timer <= 0) {
      setLoading(false);
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const verifyOtp = async () => {
    if (!isValid || loading) {
      return;
    }

    try {
      setLoading(true);
      console.log('verifyOtp -> true', phoneNumber, otp, reqId);

      const firebaseUser = await authData.verifyOTPAndLogin(
        phoneNumber,
        otp,
        reqId,
      );

      if (!firebaseUser?.uid) {
        throw new Error('Failed to authenticate user.');
      }
      const userInfo = await authData.getUser(firebaseUser?.uid);
      console.log('verifyOtp -> userInfo', userInfo);

      // Brand new user
      if (!userInfo) {
        navigation.replace('Gender', {
          user: firebaseUser,
        });
        return;
      }

      await refreshUser();

      // Existing user but onboarding not completed
      if (!userInfo?.profile?.gender) {
        navigation.replace('Gender', {
          user: firebaseUser,
        });
        return;
      }

      if (userInfo?.profile?.gender === 'male') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else if (userInfo?.profile?.gender === 'female') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'FemaleBottomTabs' }],
        });
      } else {
        navigation.replace('Gender', {
          user: firebaseUser,
        });
      }
    } catch (e: any) {
      let message = 'Something went wrong. Please try again.';

      switch (e?.code) {
        case 'auth/invalid-verification-code':
          message = 'The OTP you entered is incorrect. Please try again.';
          break;

        case 'auth/code-expired':
          message = 'This OTP has expired. Please request a new OTP.';
          break;

        case 'auth/session-expired':
          message =
            'Your verification session has expired. Please resend the OTP.';
          break;

        case 'auth/too-many-requests':
          message =
            'Too many attempts. Please wait a few minutes and try again.';
          break;

        default:
          if (e?.message) {
            message = e.message;
          }
      }

      Alert.alert('Verification Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (loading) {
      return;
    }
    setLoading(true);

    try {
      const response = await OTPWidget.retryOTP({
        reqId,
        retryChannel: '11',
      });

      if (response?.type === 'error') {
        throw new Error(
          response?.message || 'Failed to resend OTP. Please try again.',
        );
      }

      console.log('resendOtp -> response', response);
      setOtp('');
      setTimer(30);
      Alert.alert('Success', 'OTP has been sent successfully.');
    } catch (e: any) {
      Alert.alert('Unable to resend OTP', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 100,
        }}
      >
        <StatusBar
          backgroundColor={Colors.background}
          barStyle="dark-content"
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <Image
            source={require('../assets/otp.png')}
            resizeMode="contain"
            style={styles.image}
          />

          <Text style={styles.description}>
            Your login OTP is sent to{' '}
            <Text style={styles.bold}>{phoneNumber}</Text>
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.changeText}>
              Not your number?{' '}
              <Text style={styles.changeLink}>Change here.</Text>
            </Text>
          </TouchableOpacity>

          <LinearGradient
            colors={Colors.gradient}
            style={styles.gradientBorder}
          >
            <View style={styles.inputContainer}>
              <TextInput
                value={otp}
                onChangeText={text => setOtp(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="Enter OTP"
                placeholderTextColor={Colors.placeholder}
                style={styles.input}
              />
            </View>
          </LinearGradient>

          <GradientButton
            title={loading ? 'Please wait...' : 'Proceed'}
            disabled={!isValid || loading}
            onPress={verifyOtp}
          />

          <View style={styles.timerContainer}>
            {timer === 0 ? (
              <TouchableOpacity
                disabled={loading}
                activeOpacity={0.8}
                onPress={resendOtp}
              >
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
      </ScrollView>
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
