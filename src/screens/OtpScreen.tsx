import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import authData from '../firebase/authData';
import { hasValidUsername } from '../utils/profileValidation';
import { useUser } from '../hooks/UserContext';
import { resendMSGOtp, verifyMSGOtp } from '../api/calls';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const COLORS = {
  background: '#F2FFFC',
  navy: '#071A2D',
  teal: '#08A98F',
  tealDark: '#078A78',
  tealPale: '#E2F9F4',
  body: '#747A91',
  border: '#C9EEE7',
  white: '#FFFFFF',
};

interface Props {
  navigation: any;
  route: any;
}

const OtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const phoneNumber = route?.params?.phone ?? '';
  const displayPhoneNumber = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+${phoneNumber}`;
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
        navigation.replace('OnboardingPreferences', {
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
        navigation.replace('OnboardingPreferences', {
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
    <SafeAreaView
      style={styles.container}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <StatusBar
          backgroundColor={COLORS.background}
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
              size={24}
              color={COLORS.tealDark}
            />
          </TouchableOpacity>

          <Image
            source={require('../assets/otp-verification-teal.png')}
            resizeMode="contain"
            style={styles.image}
          />

          <Text style={styles.eyebrow}>SECURE VERIFICATION</Text>

          <Text style={styles.title}>Verify your number</Text>

          <Text style={styles.description}>
            Enter the 4-digit code sent to{' '}
            <Text style={styles.bold}>{displayPhoneNumber}</Text>
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

              {[0, 1, 2, 3].map(index => {
                const isActive =
                  Boolean(otp[index]) ||
                  (isOtpFocused && index === activeOtpIndex);

                return (
                  <View
                    key={index}
                    style={[styles.pinCell, isActive && styles.pinCellActive]}
                  >
                    <Text style={styles.pinDigit}>{otp[index] ?? ''}</Text>
                    {isOtpFocused &&
                      !otp[index] &&
                      index === activeOtpIndex && (
                        <Animated.View
                          style={[styles.cursor, { opacity: cursorOpacity }]}
                        />
                      )}
                  </View>
                );
              })}
            </View>

            <Text style={styles.pinHint}>{otp.length}/4 digits entered</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!isValid || loading}
            onPress={() => verifyOtp()}
            accessibilityRole="button"
            accessibilityState={{
              disabled: !isValid || loading,
              busy: loading,
            }}
            style={[
              styles.verifyButton,
              isValid && !loading && styles.verifyButtonActive,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.verifyButtonText}>
                  Verify &amp; Continue
                </Text>
                <View style={styles.verifyArrowCircle}>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={21}
                    color={COLORS.white}
                  />
                </View>
              </>
            )}
          </TouchableOpacity>

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
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  keyboardAvoidingView: {
    flex: 1,
    minHeight: 760,
  },

  backButton: {
    marginLeft: 20,
    marginTop: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.tealPale,
  },

  image: {
    width: 218,
    height: 218,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 8,
  },

  eyebrow: {
    color: COLORS.tealDark,
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 2.2,
    textAlign: 'center',
    marginBottom: 14,
  },

  title: {
    color: COLORS.navy,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.8,
    marginBottom: 12,
  },

  description: {
    fontSize: 16,
    color: COLORS.body,
    textAlign: 'center',
    marginHorizontal: 22,
    lineHeight: 22,
  },

  bold: {
    color: COLORS.tealDark,
    fontWeight: '800',
  },

  changeText: {
    marginTop: 10,
    fontSize: 15,
    textAlign: 'center',
    color: COLORS.body,
  },

  changeLink: {
    color: COLORS.tealDark,
    fontWeight: '800',
  },

  otpSection: {
    marginTop: 43,
    alignItems: 'center',
  },

  pinRow: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
  },

  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 2,
  },

  pinCell: {
    width: 66,
    height: 69,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 1,
  },

  pinCellActive: {
    borderColor: COLORS.teal,
    borderWidth: 2,
  },

  pinDigit: {
    color: COLORS.navy,
    fontSize: 25,
    fontWeight: '800',
  },

  cursor: {
    position: 'absolute',
    width: 2,
    height: 26,
    borderRadius: 1,
    backgroundColor: COLORS.teal,
  },

  pinHint: {
    color: COLORS.body,
    fontSize: 13,
    marginTop: 15,
  },

  verifyButton: {
    height: 59,
    marginHorizontal: 28,
    marginTop: 37,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.14,
    shadowRadius: 15,
    elevation: 4,
  },

  verifyButtonActive: {
    shadowOpacity: 0.2,
    elevation: 5,
  },

  verifyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },

  verifyArrowCircle: {
    position: 'absolute',
    right: 13,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  timerContainer: {
    marginTop: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timerText: {
    fontSize: 14,
    color: COLORS.body,
  },

  timer: {
    color: COLORS.tealDark,
    fontWeight: '700',
  },

  resend: {
    fontSize: 15,
    color: COLORS.tealDark,
    fontWeight: '800',
  },
});

export default OtpScreen;
