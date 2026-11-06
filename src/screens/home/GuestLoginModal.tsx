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

type Props = {
  visible: boolean;
  onClose: () => void;
  onAuthenticated: (isExpert: boolean) => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
};

const GuestLoginModal = ({
  visible,
  onClose,
  onAuthenticated,
  onOpenTerms,
  onOpenPrivacy,
}: Props) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      setStep('phone');
      setOtp('');
      setRequestId('');
      setLoading(false);
    }
  }, [visible]);

  const requestOtp = async () => {
    if (phone.length !== 10 || loading) return;
    try {
      setLoading(true);
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
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 4 || loading) return;
    try {
      setLoading(true);
      const response = await verifyMSGOtp(`91${phone}`, otp, requestId);
      if (!response?.success || !response.token) {
        throw new Error(response?.message || 'Invalid OTP.');
      }
      const firebaseUser = await authData.loginWithCustomToken(response.token);
      const existing = await authData.getUser(firebaseUser.uid);
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
      onAuthenticated(existing?.isExpert === true);
    } catch (error: any) {
      Alert.alert('Login failed', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
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
                name="phone-outline"
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
            {step === 'phone' ? 'Login to start calling' : 'Enter your OTP'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Use your mobile number. Profile details can be added later.'
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
            disabled={loading || (step === 'phone' ? phone.length !== 10 : otp.length !== 4)}
            onPress={step === 'phone' ? requestOtp : verifyOtp}
            style={[
              styles.primaryButton,
              (loading ||
                (step === 'phone' ? phone.length !== 10 : otp.length !== 4)) &&
                styles.primaryButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryText}>
                {step === 'phone' ? 'Get OTP' : 'Login & call'}
              </Text>
            )}
          </TouchableOpacity>

          {step === 'otp' && (
            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.changeNumber}>Change number</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.legal}>By continuing, you agree to Speakly’s</Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity
              accessibilityRole="link"
              onPress={onOpenTerms}
            >
              <Text style={styles.legalLink}>Terms & Conditions</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>and</Text>
            <TouchableOpacity
              accessibilityRole="link"
              onPress={onOpenPrivacy}
            >
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 15,
    borderRadius: 20,
    backgroundColor: Colors.white,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 10,
    color: Colors.text,
    fontSize: 23,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 3,
    color: Colors.subText,
    fontSize: 14,
    lineHeight: 20,
  },
  privacyNote: {
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  privacyText: {
    flex: 1,
    marginLeft: 7,
    color: Colors.primary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  inputRow: {
    minHeight: 50,
    marginTop: 12,
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
    minHeight: 48,
    marginTop: 11,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  changeNumber: {
    marginTop: 9,
    color: Colors.primary,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  legal: {
    marginTop: 10,
    color: Colors.subText,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
  },
  legalLinks: {
    marginTop: 1,
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
