import Colors from '../../../constants/colors';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';
import strings from '../../../constants/strings';

const AVATAR = 'https://i.pravatar.cc/400?img=47';

export default function IncomingCallScreen() {
  const pulse = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),

        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );

    const waveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),

        Animated.timing(wave, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();
    waveAnimation.start();

    return () => {
      pulseAnimation.stop();
      waveAnimation.stop();
    };
  }, [pulse, wave]);

  const avatarScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.8],
  });

  const waveScale = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.2],
  });

  const waveOpacity = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const onAccept = () => {
    console.log('Accept Call');
  };

  const onDecline = () => {
    console.log('Decline Call');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.logo}>{strings.appName}</Text>

        <Text style={styles.title}>Incoming Voice Call</Text>

        <Text style={styles.subTitle}>Someone wants to talk with you</Text>
      </View>

      <View style={styles.body}>
        <Animated.View
          style={[
            styles.avatarWrapper,
            {
              transform: [{ scale: avatarScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
              },
            ]}
          />

          <View style={styles.avatarBorder}>
            <Image source={{ uri: AVATAR }} style={styles.avatar} />
          </View>
        </Animated.View>

        <Text style={styles.name}>Isha</Text>

        <Text style={styles.city}>Chennai • 24 Years</Text>

        <Animated.View
          style={[
            styles.waveContainer,
            {
              opacity: waveOpacity,
              transform: [{ scaleX: waveScale }],
            },
          ]}
        >
          <View style={styles.wave} />
        </Animated.View>

        <View style={styles.secureCard}>
          <Icon name="shield-check" size={18} color={Colors.online} />

          <Text style={styles.secureText}>End-to-End Encrypted</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={styles.decline}
              activeOpacity={0.85}
              onPress={onDecline}
            >
              <Icon name="phone-hangup" size={34} color={Colors.white} />
            </TouchableOpacity>

            <Text style={styles.actionText}>Decline</Text>
          </View>

          <View style={styles.actionItem}>
            <TouchableOpacity
              style={styles.accept}
              activeOpacity={0.85}
              onPress={onAccept}
            >
              <Icon name="phone" size={34} color={Colors.white} />
            </TouchableOpacity>

            <Text style={styles.actionText}>Accept</Text>
          </View>
        </View>

        <View style={styles.swipeCard}>
          <Text style={styles.swipeText}>Tap the green button to answer</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
