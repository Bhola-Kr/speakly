import React, { useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';

import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import Colors from '../constants/colors';
import authData from '../firebase/authData';

const SplashScreen = ({ navigation }: any) => {
  const navigateTo = useCallback(
    (screen: string) => {
      navigation.reset({
        index: 0,
        routes: [{ name: screen }],
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

      switch (userInfo?.profile?.gender) {
        case 'male':
          navigateTo('Main');
          break;
        case 'female':
          navigateTo(
            userInfo?.verification?.voiceVerified === true
              ? 'FemaleBottomTabs'
              : 'AudioVerification',
          );
          break;
        default:
          navigateTo('Gender');
      }
    } catch (error) {
      console.error('SplashScreen:', error);
      navigateTo('Login');
    }
  }, [navigateTo]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle={'light-content'} />
      <View style={styles.content}>
        {/* Replace with your logo */}
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* <Text style={styles.title}>VoiceTamil</Text> */}

        <Text style={styles.subtitle}>Connect • Talk • Enjoy</Text>
      </View>

      <View style={styles.bottom}>
        <ActivityIndicator color={Colors.secondary} size={'large'} />

        <Text style={styles.loading}>Loading...</Text>

        <Text style={styles.version}>Version {DeviceInfo.getVersion()}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 70,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: 240,
    height: 240,
    marginBottom: 30,
  },

  title: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 1,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.white,
    opacity: 0.85,
    letterSpacing: 0.5,
  },

  bottom: {
    alignItems: 'center',
  },

  loading: {
    marginTop: 14,
    fontSize: 14,
    color: Colors.white,
  },

  version: {
    marginTop: 20,
    fontSize: 13,
    color: Colors.placeholder,
  },
});

export default SplashScreen;
