import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CountryPicker, {
  Country,
  CountryCode,
} from 'react-native-country-picker-modal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { sendOtp } from '../api/calls';

const COLORS = {
  background: '#F2FFFC',
  card: '#FFFFFF',
  navy: '#071A2D',
  teal: '#08A98F',
  tealDark: '#078A78',
  tealPale: '#E2F9F4',
  body: '#6D748B',
  placeholder: '#9B9EAA',
  border: '#D7DADF',
  disabled: '#D9DBDE',
  white: '#FFFFFF',
};

const benefits = [
  { icon: 'message-text', label: 'Real people' },
  { icon: 'waveform', label: 'Natural\nconversations' },
  { icon: 'chart-bar', label: 'Flexible\npractice' },
] as const;

interface Props {
  navigation: any;
  route: any;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<CountryCode>('IN');
  const [callingCode, setCallingCode] = useState('91');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd());
    });
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const isValid = mobile.length === 10;
  const canContinue = isValid && acceptedPolicies && !loading;

  const onSelectCountry = (selectedCountry: Country) => {
    setCountry(selectedCountry.cca2);
    setCallingCode(selectedCountry.callingCode[0]);
  };

  const onGetOTP = async () => {
    if (!isValid || !acceptedPolicies || loading) {
      return;
    }

    try {
      setLoading(true);
      const phone = `${callingCode}${mobile}`;
      const response = await sendOtp(phone);

      console.log('onGetOTP -> response', response);
      if (!response?.success) {
        throw new Error(
          response?.message || 'Failed to send OTP. Please try again.',
        );
      }

      navigation.navigate('Otp', {
        phone,
        reqId: response.reqId,
      });
    } catch (error: any) {
      console.error('onGetOTP -> error', error);
      Alert.alert('Unable to send OTP', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={[
            styles.scrollContent,
            height > 860 && styles.tallScreenContent,
            keyboardVisible && styles.keyboardScrollContent,
          ]}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {!keyboardVisible && (
            <View style={styles.hero}>
              <View style={styles.heroGlowOne} />
              <View style={styles.heroGlowTwo} />

              <View style={styles.brandRow}>
                <View style={styles.logoMark}>
                  <MaterialCommunityIcons
                    name="message-processing"
                    size={22}
                    color={COLORS.white}
                  />
                </View>
                <Text style={styles.logo}>speakly</Text>
              </View>

              <View style={styles.heroCopyRow}>
                <Text style={styles.heading}>
                  Practice{`\n`}
                  <Text style={styles.headingAccent}>real conversations</Text>
                  {`\n`}with language{`\n`}experts
                </Text>

                <View style={styles.heroArtwork} pointerEvents="none">
                  <View style={styles.manPortraitCard}>
                    <Image
                      source={require('../assets/onboarding2.png')}
                      resizeMode="contain"
                      style={styles.manPortraitImage}
                    />
                  </View>

                  <View style={styles.womanPortraitCard}>
                    <Image
                      source={require('../assets/onboarding2.png')}
                      resizeMode="contain"
                      style={styles.womanPortraitImage}
                    />
                  </View>

                  <View style={styles.artworkWaveform}>
                    <MaterialCommunityIcons
                      name="waveform"
                      size={39}
                      color={COLORS.teal}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.heroSubtitle}>
                Speak naturally, get real-time{`\n`}feedback and build
                confidence{`\n`}
                one conversation at a time.
              </Text>

              <View style={styles.benefitsRow}>
                {benefits.map(benefit => (
                  <View key={benefit.label} style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <MaterialCommunityIcons
                        name={benefit.icon}
                        size={25}
                        color={COLORS.teal}
                      />
                    </View>
                    <Text style={styles.benefitLabel}>{benefit.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View
            style={[styles.formCard, keyboardVisible && styles.keyboardCard]}
          >
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Start speaking today</Text>
              <Text style={styles.formSubtitle}>
                Enter your mobile number to continue securely.
              </Text>
            </View>

            <View style={styles.inputBox}>
              <TouchableOpacity
                style={styles.countryContainer}
                activeOpacity={0.75}
                onPress={() => setPickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Choose country"
              >
                <CountryPicker
                  countryCode={country}
                  withFlag
                  withCallingCode
                  withFilter
                  withEmoji
                  visible={pickerVisible}
                  onSelect={onSelectCountry}
                  onClose={() => setPickerVisible(false)}
                />
                <Text style={styles.callingCode}>+{callingCode}</Text>
                <MaterialCommunityIcons
                  name="menu-down"
                  size={18}
                  color={COLORS.navy}
                  style={styles.countryArrow}
                />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TextInput
                value={mobile}
                onChangeText={text => setMobile(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="Your Mobile Number"
                placeholderTextColor={COLORS.placeholder}
                style={styles.input}
                returnKeyType="done"
                onFocus={() => {
                  setTimeout(() => scrollRef.current?.scrollToEnd(), 120);
                }}
              />
            </View>

            <View style={styles.consentRow}>
              <TouchableOpacity
                accessibilityLabel="Agree to the Terms of Use and Privacy Policy"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedPolicies }}
                activeOpacity={0.8}
                onPress={() => setAcceptedPolicies(value => !value)}
                style={[
                  styles.checkbox,
                  acceptedPolicies && styles.checkboxSelected,
                ]}
              >
                {acceptedPolicies && (
                  <MaterialCommunityIcons
                    name="check"
                    size={17}
                    color={COLORS.white}
                  />
                )}
              </TouchableOpacity>

              <Text style={styles.consentText}>
                I have read and agree to Speakly&apos;s{' '}
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('TermsAndConditions')}
                >
                  Terms of Use
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                  Privacy Policy
                </Text>
                {'.'}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={!canContinue}
              onPress={onGetOTP}
              accessibilityRole="button"
              accessibilityLabel="Send verification code"
              accessibilityState={{ disabled: !canContinue, busy: loading }}
              style={[
                styles.nextButton,
                canContinue && styles.nextButtonActive,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.nextText}>Send verification code</Text>
                  <View style={styles.nextArrowCircle}>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={18}
                      color={COLORS.white}
                    />
                  </View>
                </>
              )}
            </TouchableOpacity>

            {!acceptedPolicies && (
              <Text style={styles.consentHint}>
                Please agree before continuing.
              </Text>
            )}

            <View style={styles.disclaimerRow}>
              <View style={styles.disclaimerLine} />
              <Text style={styles.safeText}>
                Language practice only. Speakly is not a dating{`\n`}or
                matchmaking app.
              </Text>
              <View style={styles.disclaimerLine} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 10 },
  tallScreenContent: { justifyContent: 'space-between' },
  keyboardScrollContent: {
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  hero: {
    minHeight: 500,
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  heroGlowOne: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    right: -118,
    top: 30,
    backgroundColor: 'rgba(190, 250, 238, 0.58)',
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -160,
    bottom: -70,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    zIndex: 2,
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
  },
  logo: {
    marginLeft: 10,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
    color: COLORS.navy,
    letterSpacing: -1.3,
  },
  heroCopyRow: {
    height: 218,
    marginTop: 24,
    zIndex: 1,
  },
  heading: {
    position: 'absolute',
    left: 0,
    top: 13,
    width: 270,
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1.15,
    zIndex: 3,
  },
  headingAccent: { color: COLORS.teal },
  heroArtwork: {
    position: 'absolute',
    width: 198,
    height: 218,
    right: -17,
    top: -3,
    zIndex: 2,
  },
  manPortraitCard: {
    position: 'absolute',
    width: 142,
    height: 106,
    top: 0,
    left: 48,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: 19,
    backgroundColor: COLORS.white,
  },
  manPortraitImage: {
    position: 'absolute',
    width: 350,
    height: 233,
    left: -3,
    top: -39,
  },
  womanPortraitCard: {
    position: 'absolute',
    width: 147,
    height: 112,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: 19,
    backgroundColor: COLORS.white,
  },
  womanPortraitImage: {
    position: 'absolute',
    width: 350,
    height: 233,
    left: -204,
    top: -36,
  },
  artworkWaveform: {
    position: 'absolute',
    width: 67,
    height: 67,
    left: 78,
    top: 75,
    zIndex: 4,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  heroSubtitle: {
    marginTop: -4,
    color: COLORS.body,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 28,
    marginHorizontal: 10,
  },
  benefitItem: { width: 92, alignItems: 'center' },
  benefitIcon: {
    width: 49,
    height: 49,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealPale,
  },
  benefitLabel: {
    marginTop: 9,
    textAlign: 'center',
    color: '#445169',
    fontSize: 13,
    lineHeight: 16,
  },
  formCard: {
    marginHorizontal: 12,
    marginTop: 5,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 27,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    shadowColor: '#3C8C7E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
  },
  keyboardCard: { marginTop: 12 },
  formHeader: { marginBottom: 20 },
  formTitle: {
    color: COLORS.navy,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  formSubtitle: {
    marginTop: 5,
    color: COLORS.body,
    fontSize: 15,
    lineHeight: 20,
  },
  inputBox: {
    height: 64,
    borderRadius: 15,
    borderWidth: 1.3,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },
  countryContainer: { flexDirection: 'row', alignItems: 'center' },
  callingCode: {
    marginLeft: 2,
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },
  countryArrow: { marginLeft: 3 },
  divider: {
    width: 1,
    height: 38,
    marginHorizontal: 14,
    backgroundColor: '#E2E3E5',
  },
  input: {
    flex: 1,
    padding: 0,
    color: COLORS.navy,
    fontSize: 15,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 25,
    height: 25,
    marginTop: 1,
    marginRight: 15,
    borderWidth: 1.6,
    borderColor: '#8E96A4',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxSelected: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.teal,
  },
  consentText: {
    flex: 1,
    color: COLORS.body,
    fontSize: 13.5,
    lineHeight: 20,
  },
  link: {
    color: COLORS.tealDark,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  nextButton: {
    height: 51,
    marginTop: 24,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.disabled,
  },
  nextButtonActive: { backgroundColor: COLORS.teal },
  nextText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  nextArrowCircle: {
    position: 'absolute',
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  consentHint: {
    marginTop: 9,
    textAlign: 'center',
    color: '#9195A6',
    fontSize: 12,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 27,
    paddingHorizontal: 20,
  },
  disclaimerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1E4E6',
  },
  safeText: {
    marginHorizontal: 12,
    textAlign: 'center',
    color: '#9296A8',
    fontSize: 10.5,
    lineHeight: 14,
  },
});
