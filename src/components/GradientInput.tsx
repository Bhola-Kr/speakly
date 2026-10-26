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
    marginTop: 40,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 1,
  },

  container: {
    height: 70,
    borderRadius: 11,
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  input: {
    fontSize: 20,
    color: Colors.text,
  },
});
