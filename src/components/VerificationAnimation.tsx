import Colors from '../constants/colors';
// VerificationAnimation.tsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Animated,
  Easing,
  Image,
} from 'react-native';
import styles from '../screens/styles';

const Bar = ({ delay }: { delay: number }) => {
  const scale = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),

        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),

        Animated.timing(scale, {
          toValue: 0.35,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [delay, scale]);

  return (
    <Animated.View
      style={[
        styles.equalizerBar,
        {
          transform: [
            {
              scaleY: scale,
            },
          ],
        },
      ]}
    />
  );
};

const VerificationAnimation = () => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
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
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [pulse]);

  return (
    <SafeAreaView style={styles.verifyContainer}>
      <Animated.View
        style={{
          transform: [
            {
              scale: pulse,
            },
          ],
        }}
      >
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: Colors.blueLight,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 92,
              height: 92,
              borderRadius: 46,
              backgroundColor: Colors.blueBrand,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Image
              source={require('../assets/sound.png')}
              style={{
                width: 42,
                height: 42,
                resizeMode: 'contain',
                tintColor: Colors.white,
              }}
            />
          </View>
        </View>
      </Animated.View>

      <Text style={styles.verifyTitle}>Verifying your voice...</Text>

      <Text style={styles.verifySubTitle}>
        Please wait while we securely process your recording.
      </Text>

      <View style={styles.equalizerRow}>
        <Bar delay={0} />
        <Bar delay={80} />
        <Bar delay={160} />
        <Bar delay={240} />
        <Bar delay={320} />
        <Bar delay={400} />
        <Bar delay={480} />
      </View>
    </SafeAreaView>
  );
};

export default VerificationAnimation;
