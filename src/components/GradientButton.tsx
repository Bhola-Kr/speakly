import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Colors from '../constants/colors';

interface Props {
  title: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  style?: object;
}

const GradientButton = ({
  title,
  disabled = false,
  loading = false,
  onPress,
  style,
}: Props) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      onPress={onPress}
    >
      <LinearGradient
        colors={
          isDisabled
            ? [Colors.disabled, Colors.disabled]
            : Colors.buttonGradient
        }
        style={[styles.button, style]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default GradientButton;

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 55,
    marginTop: 45,
  },

  text: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
