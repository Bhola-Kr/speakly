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
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import LinearGradient from 'react-native-linear-gradient';

import Carousel from 'react-native-reanimated-carousel';

import CountryPicker, {
  Country,
  CountryCode,
} from 'react-native-country-picker-modal';

import { moderateScale, verticalScale } from 'react-native-size-matters';

const { width } = Dimensions.get('window');

const slides = [
  {
    image: require('../assets/onboarding1.png'),
    title: 'First Call @ just ₹1/min',
  },
  {
    image: require('../assets/onboarding2.png'),
    title: 'Your Avatar is your identity',
  },
];

interface Props {
  navigation: any;
  route: any;
}

const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const [mobile, setMobile] = useState('');

  const [country, setCountry] = useState<CountryCode>('IN');

  const [callingCode, setCallingCode] = useState('91');

  const [pickerVisible, setPickerVisible] = useState(false);

  const [activeSlide, setActiveSlide] = useState(0);

  const isValid = mobile.length === 10;

  const onSelectCountry = (country: Country) => {
    setCountry(country.cca2);

    setCallingCode(country.callingCode[0]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Carousel
            loop
            autoPlay
            autoPlayInterval={3000}
            width={width}
            height={verticalScale(300)}
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

          <LinearGradient
            colors={['#5B7CFF', '#FF4D5A']}
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
                placeholderTextColor="#999"
                style={styles.input}
              />
            </View>
          </LinearGradient>

          <TouchableOpacity
            onPress={() => {
              if (isValid) {
                // Navigate to OTP screen with the mobile number and calling code
                navigation.navigate('Otp', { mobile, callingCode });
              }
            }}
            disabled={!isValid}
            activeOpacity={0.8}
            style={[
              styles.button,

              {
                backgroundColor: isValid ? '#5B7CFF' : '#D0D0D0',
              },
            ]}
          >
            <Text style={styles.buttonText}>Get OTP</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            By continuing you agree to our{' '}
            <Text style={styles.link}>Terms of Use</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>

          <Text style={styles.safeText}>
            All your details are 100% safe & secure.
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
    backgroundColor: '#FFFFFF',
  },

  logo: {
    marginTop: verticalScale(35),
    textAlign: 'center',
    fontSize: moderateScale(34),
    fontWeight: '800',
    color: '#7B61FF',
  },

  slide: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {
    width: moderateScale(340),
    height: verticalScale(280),
  },

  heading: {
    textAlign: 'center',
    fontSize: moderateScale(16),
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(28),
    marginBottom: verticalScale(90),
  },

  dot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: 10,
    backgroundColor: '#D6D6D6',
    marginHorizontal: moderateScale(4),
  },

  activeDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    backgroundColor: '#5B7CFF',
  },

  gradientBorder: {
    marginHorizontal: moderateScale(22),
    padding: moderateScale(2),
    borderRadius: moderateScale(18),
  },

  inputBox: {
    height: verticalScale(40),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
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
    color: '#222',
    marginLeft: moderateScale(4),
  },

  arrow: {
    fontSize: moderateScale(10),
    color: '#777',
    marginLeft: moderateScale(5),
  },

  divider: {
    width: 1,
    height: verticalScale(32),
    backgroundColor: '#E3E3E3',
    marginHorizontal: moderateScale(15),
  },

  input: {
    flex: 1,
    fontSize: moderateScale(18),
    color: '#111',
    padding: 0,
  },

  button: {
    height: verticalScale(45),
    marginHorizontal: moderateScale(60),
    marginTop: verticalScale(28),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#5B7CFF',

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.25,

    shadowRadius: 10,

    elevation: 6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(19),
    fontWeight: '700',
  },

  footer: {
    marginTop: verticalScale(32),
    paddingHorizontal: moderateScale(25),
    textAlign: 'center',
    color: '#777777',
    fontSize: moderateScale(14),
    lineHeight: verticalScale(20),
  },

  link: {
    color: '#111111',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  safeText: {
    marginTop: verticalScale(8),
    textAlign: 'center',
    color: '#888888',
    fontSize: moderateScale(13),
  },
});
