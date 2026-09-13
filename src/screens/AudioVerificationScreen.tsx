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

import { PermissionsAndroid, Platform } from 'react-native';

import VoiceDetector from './voiceDetector';

enum ScreenState {
  IDLE,
  RECORDING,
  VERIFYING,
  SUCCESS,
  FAILED,
}

const AudioVerificationScreen = ({ navigation }: any) => {
  const [screenState, setScreenState] = useState(ScreenState.SUCCESS);
  const [seconds, setSeconds] = useState(0);

  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.3)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestMicPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'Voice verification needs access to your microphone.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

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

    return () => {
      clearInterval(timerRef.current!);

      if (screenState === ScreenState.RECORDING) {
        VoiceDetector.stopAndVerify().catch(() => {});
      }
    };
  }, [glow, pulse, screenState]);

  const formatTime = () => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');

    const s = (seconds % 60).toString().padStart(2, '0');

    return `${m}:${s}`;
  };

  const onMicPress = async () => {
    if (screenState === ScreenState.IDLE) {
      const permission = await requestMicPermission();

      if (!permission) {
        setScreenState(ScreenState.FAILED);
        return;
      }

      try {
        await VoiceDetector.startRecording();

        setSeconds(0);

        setScreenState(ScreenState.RECORDING);
      } catch (error) {
        console.log('Start Recording Error:', error);

        setScreenState(ScreenState.FAILED);
      }

      return;
    }

    if (screenState === ScreenState.RECORDING) {
      clearInterval(timerRef.current!);

      setScreenState(ScreenState.VERIFYING);

      try {
        const result = await VoiceDetector.stopAndVerify();

        console.log('VOICE RESULT', result);

        /**
         * For female verification only.
         * Change to "male" if verifying male users.
         */

        if (result.gender === 'female' && result.confidence >= 0.5) {
          setScreenState(ScreenState.SUCCESS);
        } else {
          setScreenState(ScreenState.FAILED);
        }
      } catch (error) {
        console.log('Verification Error:', error);

        setScreenState(ScreenState.FAILED);
      }
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
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'FemaleBottomTabs' }], // Home Screen
              });
            }}
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
            The recorded voice could not be verified as a female voice.
            {'\n\n'}
            Please try again by ensuring:
            {'\n\n'}• A female speaks during verification.
            {'\n'}• The voice is clear and natural.
            {'\n'}• There is minimal background noise.
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

          {/* <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={styles.skipText}>Skip & Go to Home</Text>
          </TouchableOpacity> */}
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
          "Hello, I am verifying my voice. Thank you."
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
