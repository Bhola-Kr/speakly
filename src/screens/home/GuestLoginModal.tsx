import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import { sendOtp, verifyMSGOtp } from '../../api/calls';
import authData from '../../firebase/authData';
import { createAnonymousName } from '../../utils/profileValidation';
import { copy } from '../../constants/strings';
import { trackGuestAuthentication } from '../../firebase/analytics';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAuthenticated: (isExpert: boolean) => void | Promise<void>;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  hostName?: string;
};

const GuestLoginModal = ({
  visible,
  onClose,
  onAuthenticated,
  onOpenTerms,
  onOpenPrivacy,
  hostName,
}: Props) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'phone' | 'google' | null>(null);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      setStep('phone');
      setOtp('');
      setRequestId('');
      setLoading(false);
      setAuthMethod(null);
    }
  }, [visible]);

  const requestOtp = async () => {
    if (phone.length !== 10 || loading) return;
    try {
      setLoading(true);
      setAuthMethod('phone');
      const response = await sendOtp(`91${phone}`);
      if (!response?.success || !response.reqId) {
        throw new Error(response?.message || 'Unable to send OTP.');
      }
      setRequestId(response.reqId);
      setStep('otp');
      requestAnimationFrame(() => otpRef.current?.focus());
    } catch (error: any) {
      Alert.alert('Unable to send OTP', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setAuthMethod(null);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 4 || loading) return;
    try {
      setLoading(true);
      setAuthMethod('phone');
      const response = await verifyMSGOtp(`91${phone}`, otp, requestId);
      if (!response?.success || !response.token) {
        throw new Error(response?.message || 'Invalid OTP.');
      }
      const firebaseUser = await authData.loginWithCustomToken(response.token);
      const existing = await authData.getUser(firebaseUser.uid);
      const isNewUser = !existing;
      if (!existing) {
        await authData.createUser(firebaseUser, 'male', 'learner', 'English');
        await authData.updateProfile({
          name: createAnonymousName(firebaseUser.uid),
          gender: 'male',
          role: 'learner',
          avatarId: 1,
          avatarSelected: true,
          practiceLanguage: 'English',
          nativeLanguage: 'English',
          supportedLanguages: ['English'],
        });
      }
      trackGuestAuthentication(
        firebaseUser.uid,
        existing?.isExpert === true,
        'phone_otp',
        isNewUser,
      );
      await onAuthenticated(existing?.isExpert === true);
    } catch (error: any) {
      Alert.alert('Login failed', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setAuthMethod(null);
    }
  };

  const loginWithGoogle = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setAuthMethod('google');
      const firebaseUser = await authData.loginWithGoogle();
      if (!firebaseUser) return;

      const existing = await authData.getUser(firebaseUser.uid);
      const isNewUser = !existing;
      if (!existing) {
        await authData.createUser(firebaseUser, 'male', 'learner', 'English');
        await authData.updateProfile({
          name:
            firebaseUser.displayName?.trim() ||
            createAnonymousName(firebaseUser.uid),
          gender: 'male',
          role: 'learner',
          avatarId: 1,
          avatarSelected: true,
          practiceLanguage: 'English',
          nativeLanguage: 'English',
          supportedLanguages: ['English'],
        });
      }
      trackGuestAuthentication(
        firebaseUser.uid,
        existing?.isExpert === true,
        'google',
        isNewUser,
      );
      await onAuthenticated(existing?.isExpert === true);
    } catch (error: any) {
      Alert.alert('Google login failed', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setAuthMethod(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="account-circle-outline"
                size={24}
                color={Colors.primary}
              />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons
                name="close"
                size={23}
                color={Colors.subText}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>
            {step === 'phone'
              ? hostName
                ? `Sign in to call ${hostName}`
                : 'Sign in to start your free call'
              : 'Enter your OTP'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? copy.brand.offer
              : `We sent a 4-digit code to +91 ${phone}.`}
          </Text>
          <View style={styles.privacyNote}>
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={17}
              color={Colors.primary}
            />
            <Text style={styles.privacyText}>
              Your number stays private and is never shared during calls.
            </Text>
          </View>

          {step === 'phone' ? (
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                value={phone}
                onChangeText={value =>
                  setPhone(value.replace(/\D/g, '').slice(0, 10))
                }
                placeholder="Mobile number"
                placeholderTextColor={Colors.placeholder}
                keyboardType="number-pad"
                autoFocus
                style={styles.input}
              />
            </View>
          ) : (
            <TextInput
              ref={otpRef}
              value={otp}
              onChangeText={value =>
                setOtp(value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="4-digit OTP"
              placeholderTextColor={Colors.placeholder}
              keyboardType="number-pad"
              maxLength={4}
              style={[styles.inputRow, styles.otpInput]}
            />
          )}

          <TouchableOpacity
            disabled={
              loading ||
              (step === 'phone' ? phone.length !== 10 : otp.length !== 4)
            }
            onPress={step === 'phone' ? requestOtp : verifyOtp}
            style={[
              styles.primaryButton,
              (loading ||
                (step === 'phone' ? phone.length !== 10 : otp.length !== 4)) &&
                styles.primaryButtonDisabled,
            ]}
          >
            {loading && authMethod === 'phone' ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryText}>
                {step === 'phone' ? 'Get OTP' : 'Verify & Start Call'}
              </Text>
            )}
          </TouchableOpacity>

          {step === 'phone' && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
                disabled={loading}
                onPress={loginWithGoogle}
                activeOpacity={0.82}
                style={[
                  styles.googleButton,
                  loading && styles.googleButtonDisabled,
                ]}
              >
                <View style={styles.googleIconWrap}>
                  {loading && authMethod === 'google' ? (
                    <ActivityIndicator size="small" color="#4285F4" />
                  ) : (
                    <MaterialCommunityIcons
                      name="google"
                      size={21}
                      color="#4285F4"
                    />
                  )}
                </View>
                <Text style={styles.googleButtonText}>
                  Continue with Google
                </Text>
                <View style={styles.googleButtonSpacer} />
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.changeNumber}>Change number</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.legal}>
            By continuing, you agree to Speakly 121’s
          </Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity accessibilityRole="link" onPress={onOpenTerms}>
              <Text style={styles.legalLink}>Terms & Conditions</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>and</Text>
            <TouchableOpacity accessibilityRole="link" onPress={onOpenPrivacy}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(7,26,45,0.48)',
  },
  card: {
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 18,
    backgroundColor: Colors.white,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 6,
    color: Colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: Colors.subText,
    fontSize: 14,
    lineHeight: 18,
  },
  privacyNote: {
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  privacyText: {
    flex: 1,
    marginLeft: 7,
    color: Colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  inputRow: {
    minHeight: 46,
    marginTop: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  prefix: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  input: { flex: 1, marginLeft: 10, color: Colors.text, fontSize: 16 },
  otpInput: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 8,
  },
  primaryButton: {
    minHeight: 46,
    marginTop: 8,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  dividerRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    marginHorizontal: 10,
    color: Colors.subText,
    fontSize: 12,
    fontWeight: '700',
  },
  googleButton: {
    width: '100%',
    minHeight: 48,
    marginTop: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  googleButtonDisabled: { opacity: 0.55 },
  googleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  googleButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  googleButtonSpacer: { width: 32 },
  changeNumber: {
    marginTop: 6,
    color: Colors.primary,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  legal: {
    marginTop: 6,
    color: Colors.subText,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
  },
  legalLinks: {
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legalLink: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    marginHorizontal: 5,
    color: Colors.subText,
    fontSize: 11,
  },
});

export default GuestLoginModal;
