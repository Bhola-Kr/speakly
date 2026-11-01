import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';

import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import Colors from '../constants/colors';
import authData from '../firebase/authData';
import { hasValidUsername } from '../utils/profileValidation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const SplashScreen = ({ navigation }: any) => {
  const navigateTo = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      navigation.reset({
        index: 0,
        routes: [{ name: screen, params }],
      });
    },
    [navigation],
  );

  const initializeApp = useCallback(async () => {
    try {
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));

      const currentUser = auth().currentUser;

      if (!currentUser) {
        navigateTo('Login');
        return;
      }

      const userInfo = await authData.getUser(currentUser.uid);

      if (!userInfo) {
        navigateTo('Login');
        return;
      }

      if (
        !userInfo?.profile?.gender ||
        !hasValidUsername(userInfo?.profile?.name) ||
        userInfo?.profile?.avatarSelected !== true
      ) {
        navigateTo('OnboardingPreferences', {
          user: currentUser,
          existingProfile: userInfo?.profile,
        });
        return;
      }

      if (
        userInfo?.profile?.role === 'expert' &&
        userInfo?.expertApplication?.status !== 'approved' &&
        userInfo?.expertApplication?.status !== 'rejected'
      ) {
        navigateTo('AudioVerification', {
          language:
            userInfo?.profile?.supportedLanguages?.[0] ||
            userInfo?.profile?.nativeLanguage ||
            userInfo?.profile?.practiceLanguage ||
            'English',
          languages: userInfo?.profile?.supportedLanguages,
        });
        return;
      }

      navigateTo(userInfo?.isExpert === true ? 'FemaleBottomTabs' : 'Main');
    } catch (error) {
      console.error('SplashScreen:', error);
      navigateTo('Login');
    }
  }, [navigateTo]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#F7FFFE', '#E7FAF6', '#FFFFFF']}
        style={styles.container}
      >
        <StatusBar backgroundColor="#F7FFFE" barStyle="dark-content" />
        <View style={styles.content}>
          {/* Replace with your logo */}
          <View style={styles.logoMark}>
            <MaterialCommunityIcons
              name="waveform"
              size={54}
              color={Colors.white}
            />
          </View>

          <Text style={styles.title}>speakly</Text>

          <Text style={styles.subtitle}>
            Real conversations. Real confidence.
          </Text>
        </View>

        <View style={styles.bottom}>
          <ActivityIndicator color={Colors.secondary} size="large" />

          <Text style={styles.loading}>Loading...</Text>

          <Text style={styles.version}>Version {DeviceInfo.getVersion()}</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FFFE',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 70,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoMark: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 38,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1.5,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.subText,
    letterSpacing: 0.5,
  },

  bottom: {
    alignItems: 'center',
  },

  loading: {
    marginTop: 14,
    fontSize: 14,
    color: Colors.subText,
  },

  version: {
    marginTop: 20,
    fontSize: 13,
    color: Colors.subText,
  },
});

export default SplashScreen;
