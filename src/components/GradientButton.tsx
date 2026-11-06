import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Colors from '../constants/colors';
import UI from '../constants/ui';

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
      activeOpacity={0.88}
      disabled={isDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={styles.touchable}
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
  touchable: {
    marginHorizontal: UI.spacing.lg,
    marginTop: 22,
  },
  button: {
    height: UI.size.primaryButtonHeight,
    borderRadius: UI.radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 6,
  },

  text: {
    color: Colors.white,
    fontSize: UI.typography.body,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
});
