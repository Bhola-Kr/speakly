import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';
import strings from '../../../constants/strings';

const AVATAR = 'https://i.pravatar.cc/400?img=47';

interface Props {
  navigation: any;
  route: any;
}

export const OutgoingCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const data = route.params;
  console.log('data', data);

  const ripple = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const [dots, setDots] = useState('');

  useEffect(() => {
    Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),

        Animated.timing(glow, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const timer = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) {
          return '';
        }

        return prev + '.';
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.9],
  });

  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0],
  });

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.logo}>{strings.appName}</Text>

        <Text style={styles.status}>Connecting{dots}</Text>

        <Text style={styles.statusSub}>{`Waiting for ${
          data.user?.englishName ?? 'Test'
        }to answer`}</Text>
      </View>

      <View style={styles.body}>
        <Animated.View
          style={[
            styles.avatarWrapper,
            {
              transform: [{ scale: glowScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />

          <View style={styles.avatarBorder}>
            <Image
              source={{
                uri: AVATAR,
              }}
              style={styles.avatar}
            />
          </View>
        </Animated.View>

        <Text style={styles.name}>{`${data.user?.tamilName ?? 'Test'}`}</Text>

        <Text
          style={styles.city}
        >{`${data?.user?.city} • ${data?.user?.age} Years`}</Text>

        <View style={styles.waveContainer}>
          <Animated.View
            style={[
              styles.ripple,
              {
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />

          <TouchableOpacity activeOpacity={0.9} style={styles.phoneButton}>
            <Icon name="phone" size={34} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.callingText}>Calling user...</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Icon name="headphones" size={28} color="#D4AF37" />

        <Text style={styles.footerText}>
          Use headphones for better voice quality and reduced background noise.
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.endButton}
        onPress={() => {
          navigation.goBack();
        }}
      >
        <Text style={styles.endText}>Cancel Call</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};
