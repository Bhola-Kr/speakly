import React, { useState } from 'react';

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
} from 'react-native';

import { Alert } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import LinearGradient from 'react-native-linear-gradient';

import Carousel from 'react-native-reanimated-carousel';

import CountryPicker, {
  Country,
  CountryCode,
} from 'react-native-country-picker-modal';

import { moderateScale, verticalScale } from 'react-native-size-matters';
import GradientButton from '../components/GradientButton';
import Colors from '../constants/colors';
import { sendOtp } from '../api/calls';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const slides = [
  {
    image: require('../assets/onboarding2.png'),
    title: 'Practice real conversations with language experts.',
  },
  {
    title: 'Choose a language, pick a topic, and speak with confidence.',
    image: require('../assets/onboarding1.png'),
  },
];

interface Props {
  navigation: any;
  route: any;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);

  const [country, setCountry] = useState<CountryCode>('IN');

  const [callingCode, setCallingCode] = useState('91');

  const [pickerVisible, setPickerVisible] = useState(false);

  const [activeSlide, setActiveSlide] = useState(0);

  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const isValid = mobile.length === 10;

  const onSelectCountry = (country: Country) => {
    setCountry(country.cca2);

    setCallingCode(country.callingCode[0]);
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={23}
                color={Colors.white}
              />
            </View>
            <Text style={styles.logo}>speakly</Text>
          </View>

          <Carousel
            loop
            autoPlay
            autoPlayInterval={3000}
            width={width}
            height={verticalScale(260)}
            data={slides}
            scrollAnimationDuration={800}
            onSnapToItem={index => setActiveSlide(index)}
            renderItem={({ item }) => (
              <View style={styles.slide}>
                <Image
                  source={item.image}
                  resizeMode="contain"
                  style={styles.image}
                />
                <Text style={styles.heading}>{item.title}</Text>
              </View>
            )}
          />

          <View style={styles.dots}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, activeSlide === index && styles.activeDot]}
              />
            ))}
          </View>

          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Start speaking today</Text>
            <Text style={styles.formSubtitle}>
              Enter your mobile number to continue securely.
            </Text>
          </View>

          <LinearGradient
            colors={Colors.buttonGradient}
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 0,
            }}
            style={styles.gradientBorder}
          >
            <View style={styles.inputBox}>
              <TouchableOpacity
                style={styles.countryContainer}
                onPress={() => setPickerVisible(true)}
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

                <Text style={styles.arrow}>▼</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TextInput
                value={mobile}
                onChangeText={text => {
                  setMobile(text.replace(/[^0-9]/g, ''));
                }}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="Your Mobile Number"
                placeholderTextColor={Colors.gray153}
                style={styles.input}
              />
            </View>
          </LinearGradient>

          <View
            style={[
              styles.consentCard,
              acceptedPolicies && styles.consentCardSelected,
            ]}
          >
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
                  color={Colors.white}
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

          <GradientButton
            title={loading ? 'Please wait...' : 'Next'}
            onPress={onGetOTP}
            disabled={!isValid || !acceptedPolicies || loading}
            loading={loading}
          />

          {!acceptedPolicies && (
            <Text style={styles.consentHint}>
              Please agree before continuing.
            </Text>
          )}

          <Text style={styles.safeText}>
            Language practice only. Speakly is not a dating or matchmaking app.
          </Text>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  logo: {
    marginLeft: 9,
    fontSize: moderateScale(24),
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(12),
  },

  logoMark: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(13),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },

  slide: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {
    width: moderateScale(300),
    height: verticalScale(210),
  },

  heading: {
    textAlign: 'center',
    fontSize: moderateScale(17),
    color: Colors.text,
    fontWeight: '700',
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(22),
  },

  dot: {
    width: moderateScale(7),
    height: moderateScale(8),
    borderRadius: 10,
    backgroundColor: Colors.gray214,
    marginHorizontal: moderateScale(4),
  },

  activeDot: {
    width: moderateScale(22),
    height: moderateScale(8),
    backgroundColor: Colors.blueBrand,
  },

  gradientBorder: {
    marginHorizontal: moderateScale(24),
    padding: moderateScale(1.5),
    borderRadius: moderateScale(18),
  },

  inputBox: {
    height: verticalScale(52),
    backgroundColor: Colors.white,
    borderRadius: moderateScale(17),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(15),
  },

  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  callingCode: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.text,
    marginLeft: moderateScale(4),
  },

  arrow: {
    fontSize: moderateScale(10),
    color: Colors.gray119,
    marginLeft: moderateScale(5),
  },

  divider: {
    width: 1,
    height: verticalScale(32),
    backgroundColor: Colors.gray227,
    marginHorizontal: moderateScale(15),
  },

  input: {
    flex: 1,
    fontSize: moderateScale(18),
    color: Colors.text,
    padding: 0,
  },

  formHeader: {
    marginHorizontal: moderateScale(24),
    marginBottom: verticalScale(14),
  },

  formTitle: {
    fontSize: moderateScale(23),
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.5,
  },

  formSubtitle: {
    marginTop: verticalScale(4),
    color: Colors.subText,
    fontSize: moderateScale(14),
    lineHeight: verticalScale(19),
  },

  button: {
    height: verticalScale(45),
    marginHorizontal: moderateScale(60),
    marginTop: verticalScale(28),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: Colors.blueBrand,

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.25,

    shadowRadius: 10,

    elevation: 6,
  },

  buttonText: {
    color: Colors.white,
    fontSize: moderateScale(19),
    fontWeight: '700',
  },

  consentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: moderateScale(24),
    marginTop: verticalScale(18),
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: Colors.gray214,
    borderRadius: moderateScale(16),
    backgroundColor: Colors.white,
  },

  consentCardSelected: {
    borderColor: Colors.tealDark,
  },

  checkbox: {
    width: moderateScale(24),
    height: moderateScale(24),
    marginTop: verticalScale(1),
    marginRight: moderateScale(11),
    borderWidth: 2,
    borderColor: Colors.gray153,
    borderRadius: moderateScale(7),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },

  checkboxSelected: {
    borderColor: Colors.tealDark,
    backgroundColor: Colors.tealDark,
  },

  consentText: {
    flex: 1,
    color: Colors.subText,
    fontSize: moderateScale(14),
    lineHeight: verticalScale(20),
  },

  link: {
    color: Colors.tealDark,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  consentHint: {
    marginTop: verticalScale(10),
    textAlign: 'center',
    color: Colors.subText,
    fontSize: moderateScale(12),
  },

  safeText: {
    marginTop: verticalScale(8),
    textAlign: 'center',
    color: Colors.subText,
    fontSize: moderateScale(13),
  },
});
