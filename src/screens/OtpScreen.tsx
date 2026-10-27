import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { hasValidUsername } from '../utils/profileValidation';
import { useUser } from '../hooks/UserContext';
import { resendMSGOtp, verifyMSGOtp } from '../api/calls';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  navigation: any;
  route: any;
}

const OtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const phoneNumber = route?.params?.phone ?? '';
  const [requestId, setRequestId] = useState(route?.params?.reqId ?? '');
  const { refreshUser } = useUser();

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const autoSubmittedOtpRef = useRef('');
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  const isValid = otp.length === 4;
  const activeOtpIndex = Math.min(otp.length, 3);

  useEffect(() => {
    if (timer <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    const focusTimer = setTimeout(() => otpInputRef.current?.focus(), 350);

    return () => clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    const cursorAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );

    if (isOtpFocused && !isValid) {
      cursorAnimation.start();
    } else {
      cursorAnimation.stop();
      cursorOpacity.setValue(1);
    }

    return () => cursorAnimation.stop();
  }, [cursorOpacity, isOtpFocused, isValid]);

  const handleOtpChange = (value: string) => {
    const nextOtp = value.replace(/\D/g, '').slice(0, 4);
    setOtp(nextOtp);

    if (nextOtp.length < 4) {
      autoSubmittedOtpRef.current = '';
      return;
    }

    if (autoSubmittedOtpRef.current !== nextOtp) {
      autoSubmittedOtpRef.current = nextOtp;
      requestAnimationFrame(() => verifyOtp(nextOtp));
    }
  };

  const verifyOtp = async (otpToVerify: string = otp) => {
    if (otpToVerify.length !== 4 || loading) {
      return;
    }

    try {
      setLoading(true);

      // Verify OTP through your backend
      const response = await verifyMSGOtp(phoneNumber, otpToVerify, requestId);

      if (!response?.success || !response?.uid || !response?.token) {
        throw new Error(response?.message || 'Failed to authenticate user.');
      }

      // OTP verification already returns the Firebase custom token. Reuse it
      // instead of making a second token request for the same login.
      const firebaseUser = await authData.loginWithCustomToken(response.token);

      // Get user information using the UID
      const userInfo = await authData.getUser(firebaseUser.uid);

      // Brand new user
      if (!userInfo) {
        navigation.replace('Gender', {
          user: firebaseUser,
        });
        return;
      }

      await refreshUser();

      // Profile setup is the third and final signup screen.
      if (
        !userInfo?.profile?.gender ||
        !hasValidUsername(userInfo?.profile?.name) ||
        userInfo?.profile?.avatarSelected !== true
      ) {
        navigation.replace('Gender', {
          user: firebaseUser,
          existingProfile: userInfo?.profile,
        });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [
          { name: userInfo?.isExpert === true ? 'FemaleBottomTabs' : 'Main' },
        ],
      });
    } catch (e: any) {
      console.error('verifyOtp -> error', e);

      const message = e?.message || 'Something went wrong. Please try again.';

      Alert.alert('Verification Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      // Resend OTP through your backend
      const response = await resendMSGOtp(phoneNumber, requestId);

      if (!response?.success) {
        throw new Error(
          response?.message || 'Failed to resend OTP. Please try again.',
        );
      }

      const nextRequestId = response?.data?.reqId ?? response?.data?.requestId;
      if (typeof nextRequestId === 'string' && nextRequestId) {
        setRequestId(nextRequestId);
      }

      setOtp('');
      autoSubmittedOtpRef.current = '';
      setTimer(30);
      requestAnimationFrame(() => otpInputRef.current?.focus());

      Alert.alert('Success', 'OTP has been sent successfully.');
    } catch (e: any) {
      console.error('resendOtp -> error', e);

      Alert.alert('Unable to resend OTP', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <StatusBar
          backgroundColor={Colors.background}
          barStyle="dark-content"
        />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={23}
              color={Colors.text}
            />
          </TouchableOpacity>

          <Image
            source={require('../assets/otp-verification-v2.png')}
            resizeMode="contain"
            style={styles.image}
          />

          <Text style={styles.eyebrow}>SECURE VERIFICATION</Text>

          <Text style={styles.title}>Verify your number</Text>

          <Text style={styles.description}>
            Enter the 4-digit code sent to{' '}
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

          <TouchableOpacity
            activeOpacity={1}
            disabled={loading}
            onPress={() => otpInputRef.current?.focus()}
            style={styles.otpSection}
          >
            <Text style={styles.otpLabel}>ONE-TIME PASSWORD</Text>

            <View style={styles.pinRow}>
              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={4}
                textContentType="oneTimeCode"
                autoComplete={
                  Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'
                }
                importantForAutofill="yes"
                editable={!loading}
                onSubmitEditing={() => verifyOtp()}
                onFocus={() => setIsOtpFocused(true)}
                onBlur={() => setIsOtpFocused(false)}
                style={styles.hiddenInput}
              />

              {[0, 1, 2, 3].map(index => (
                <LinearGradient
                  colors={
                    otp[index] || (isOtpFocused && index === activeOtpIndex)
                      ? Colors.gradient
                      : [Colors.gray236, Colors.gray236]
                  }
                  key={index}
                  style={styles.pinBorder}
                >
                  <View style={styles.pinCell}>
                    <Text style={styles.pinDigit}>{otp[index] ?? ''}</Text>
                    {isOtpFocused &&
                      !otp[index] &&
                      index === activeOtpIndex && (
                        <Animated.View
                          style={[styles.cursor, { opacity: cursorOpacity }]}
                        />
                      )}
                  </View>
                </LinearGradient>
              ))}
            </View>

            <Text style={styles.pinHint}>{otp.length}/4 digits entered</Text>
          </TouchableOpacity>

          <GradientButton
            title={loading ? 'Verifying...' : 'Verify & Continue'}
            disabled={!isValid || loading}
            onPress={() => verifyOtp()}
          />

          <View style={styles.timerContainer}>
            {timer === 0 ? (
              <TouchableOpacity
                disabled={loading}
                activeOpacity={0.8}
                onPress={resendOtp}
              >
                <Text style={styles.resend}>Resend code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Didn&apos;t receive a code?{' '}
                <Text style={styles.timer}>
                  Resend in 00:{String(timer).padStart(2, '0')}
                </Text>
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

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  backButton: {
    marginLeft: 20,
    marginTop: 14,
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  image: {
    width: 210,
    height: 210,
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 2,
  },

  eyebrow: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 7,
  },

  title: {
    color: Colors.text,
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },

  description: {
    fontSize: 17,
    color: Colors.subText,
    textAlign: 'center',
    marginHorizontal: 28,
    lineHeight: 24,
  },

  bold: {
    color: Colors.text,
    fontWeight: '800',
  },

  changeText: {
    marginTop: 8,
    fontSize: 15,
    textAlign: 'center',
    color: Colors.subText,
  },

  changeLink: {
    color: Colors.secondary,
    fontWeight: '800',
  },

  otpSection: {
    marginTop: 30,
    alignItems: 'center',
  },

  otpLabel: {
    color: Colors.subText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 15,
  },

  pinRow: {
    flexDirection: 'row',
    gap: 10,
    position: 'relative',
  },

  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 2,
  },

  pinBorder: {
    width: 60,
    height: 66,
    borderRadius: 18,
    padding: 1.5,
  },

  pinCell: {
    flex: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.otpInputSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pinDigit: {
    color: Colors.text,
    fontSize: 25,
    fontWeight: '800',
  },

  cursor: {
    position: 'absolute',
    width: 2,
    height: 26,
    borderRadius: 1,
    backgroundColor: Colors.primary,
  },

  pinHint: {
    color: Colors.subText,
    fontSize: 13,
    marginTop: 12,
  },

  timerContainer: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timerText: {
    fontSize: 15,
    color: Colors.gray59,
  },

  timer: {
    color: Colors.gray141,
    fontWeight: '500',
  },

  resend: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
});

export default OtpScreen;
