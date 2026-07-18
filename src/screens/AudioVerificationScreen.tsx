import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import styles from './styles';
import AnimatedWaveform from '../components/AnimatedWaveform';
import VerificationAnimation from '../components/VerificationAnimation';

enum ScreenState {
  IDLE,
  RECORDING,
  VERIFYING,
  SUCCESS,
  FAILED,
}

const AudioVerificationScreen = ({ navigation }: any) => {
  const [screenState, setScreenState] = useState(ScreenState.IDLE);
  const [seconds, setSeconds] = useState(0);

  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.3)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (screenState === ScreenState.RECORDING) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);

      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1.08,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glow, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(glow, {
              toValue: 0.3,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [screenState]);

  const formatTime = () => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');

    const s = (seconds % 60).toString().padStart(2, '0');

    return `${m}:${s}`;
  };

  const onMicPress = () => {
    if (screenState === ScreenState.IDLE) {
      setScreenState(ScreenState.RECORDING);
      return;
    }

    if (screenState === ScreenState.RECORDING) {
      clearInterval(timerRef.current);

      setScreenState(ScreenState.VERIFYING);

      setTimeout(() => {
        setScreenState(ScreenState.SUCCESS);
      }, 3000);
    }
  };

  if (screenState === ScreenState.VERIFYING) {
    return <VerificationAnimation />;
  }

  if (screenState === ScreenState.SUCCESS) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.successWrapper}>
          <View style={styles.successCircle}>
            <Text style={styles.tick}>✓</Text>
          </View>

          <Text style={styles.successTitle}>Voice Verified</Text>

          <Text style={styles.successSubtitle}>
            Your voice has been verified successfully.
          </Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === ScreenState.FAILED) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.successWrapper}>
          <View style={styles.failedCircle}>
            <Text style={styles.failedIcon}>✕</Text>
          </View>

          <Text style={styles.failedTitle}>Voice Verification Failed</Text>

          <Text style={styles.failedSubtitle}>
            We couldn't verify your voice this time.
            {'\n\n'}• Record in a quiet place{'\n'}• Speak clearly and naturally
            {'\n'}• Keep the phone 10–15 cm away
          </Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              setSeconds(0);
              setScreenState(ScreenState.IDLE);
            }}
          >
            <Text style={styles.continueText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.skipText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Voice Verification</Text>

      <Text style={styles.subHeading}>
        Read the sentence below to verify your voice.
      </Text>

      <View style={styles.quoteCard}>
        <Text style={styles.quote}>
          "Hello, my name is Rahul and this is my voice verification."
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      {screenState === ScreenState.RECORDING && (
        <>
          <AnimatedWaveform />

          <Text style={styles.timer}>{formatTime()}</Text>
        </>
      )}

      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glow,
            transform: [
              {
                scale: pulse,
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={{
          transform: [
            {
              scale: pulse,
            },
          ],
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.micButton}
          onPress={onMicPress}
        >
          <Image
            source={require('../assets/voice.png')}
            style={{
              width: 42,
              height: 42,
              resizeMode: 'contain',
              tintColor: '#FFFFFF',
            }}
          />
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.tapText}>
        {screenState === ScreenState.IDLE
          ? 'Tap to start recording'
          : 'Tap again to stop'}
      </Text>

      <View style={{ height: 60 }} />
    </SafeAreaView>
  );
};

export default AudioVerificationScreen;
