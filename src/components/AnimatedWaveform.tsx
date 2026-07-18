import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import styles from '../screens/styles';

const AnimatedBar = ({
  delay = 0,
  minHeight = 12,
  maxHeight = 65,
}: {
  delay?: number;
  minHeight?: number;
  maxHeight?: number;
}) => {
  const height = useRef(new Animated.Value(minHeight)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),

        Animated.timing(height, {
          toValue: maxHeight,
          duration: 280,
          easing: Easing.linear,
          useNativeDriver: false,
        }),

        Animated.timing(height, {
          toValue: minHeight,
          duration: 280,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          height,
        },
      ]}
    />
  );
};

const AnimatedWaveform = () => {
  return (
    <View style={styles.waveContainer}>
      <View style={styles.waveRow}>
        <AnimatedBar delay={0} minHeight={12} maxHeight={45} />
        <AnimatedBar delay={80} minHeight={22} maxHeight={60} />
        <AnimatedBar delay={150} minHeight={15} maxHeight={70} />
        <AnimatedBar delay={220} minHeight={28} maxHeight={58} />
        <AnimatedBar delay={300} minHeight={12} maxHeight={75} />
        <AnimatedBar delay={380} minHeight={18} maxHeight={62} />
        <AnimatedBar delay={450} minHeight={15} maxHeight={70} />
        <AnimatedBar delay={520} minHeight={28} maxHeight={58} />
        <AnimatedBar delay={600} minHeight={12} maxHeight={45} />
      </View>
    </View>
  );
};

export default AnimatedWaveform;
