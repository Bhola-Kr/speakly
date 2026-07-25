import React, { useEffect } from 'react';
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
import Colors from '../constants/colors';

const SplashScreen = ({ navigation }: any) => {
  useEffect(() => {
    const timer = setTimeout(async () => {
      const user = auth().currentUser;

      if (user) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }], // Home Screen
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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

        <Text style={styles.version}>Version 1.0.0</Text>
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
