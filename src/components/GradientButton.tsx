import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Colors from '../constants/colors';

interface Props {
  title: string;
  disabled?: boolean;
  onPress: () => void;
  style?: object;
}

const GradientButton = ({ title, disabled, onPress, style }: Props) => {
  return (
    <TouchableOpacity activeOpacity={0.8} disabled={disabled} onPress={onPress}>
      <LinearGradient
        colors={
          disabled ? [Colors.disabled, Colors.disabled] : Colors.buttonGradient
        }
        style={[styles.button, style]}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default GradientButton;

const styles = StyleSheet.create({
  button: {
    height: 58,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 55,
    marginTop: 45,
  },

  text: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
});
