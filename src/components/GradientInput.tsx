import React from 'react';
import { StyleSheet, TextInput, View, TextInputProps } from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Colors from '../constants/colors';
import UI from '../constants/ui';

const GradientInput = (props: TextInputProps) => {
  return (
    <LinearGradient colors={Colors.gradient} style={styles.border}>
      <View style={styles.container}>
        <TextInput
          {...props}
          style={styles.input}
          placeholderTextColor={Colors.placeholder}
        />
      </View>
    </LinearGradient>
  );
};

export default GradientInput;

const styles = StyleSheet.create({
  border: {
    marginTop: 28,
    marginHorizontal: UI.spacing.lg,
    borderRadius: UI.radius.card,
    padding: 1.5,
  },

  container: {
    minHeight: 58,
    borderRadius: UI.radius.button,
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    paddingHorizontal: UI.spacing.lg,
  },

  input: {
    fontSize: UI.typography.body,
    color: Colors.text,
  },
});
