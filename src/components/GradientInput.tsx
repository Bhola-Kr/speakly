import React from 'react';
import { StyleSheet, TextInput, View, TextInputProps } from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Colors from '../constants/colors';

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
    marginHorizontal: 24,
    borderRadius: 18,
    padding: 1.5,
  },

  container: {
    minHeight: 58,
    borderRadius: 17,
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  input: {
    fontSize: 17,
    color: Colors.text,
  },
});
