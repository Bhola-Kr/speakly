import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Colors from '../../constants/colors';
import { copy } from '../../constants/strings';

const COLORS = {
  navy: Colors.textPrimary,
  teal: Colors.accent,
  tealDark: Colors.primary,
  mint: Colors.primaryLight,
  body: Colors.textSecondary,
  white: Colors.textOnPrimary,
  line: Colors.divider,
};

interface Props {
  onPress: () => void;
}

const EmptyState = ({ onPress }: Props) => {
  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />

        <View style={styles.historySheet}>
          <View style={styles.clockCircle}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={45}
              color={COLORS.tealDark}
            />
          </View>
          <View style={styles.sheetLineLong} />
          <View style={styles.sheetLineShort} />
        </View>

        <LinearGradient
          colors={Colors.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.phoneBubble}
        >
          <Ionicons name="call" size={39} color={COLORS.white} />
          <View style={styles.bubbleTail} />
        </LinearGradient>

        <View style={[styles.signal, styles.signalOne]} />
        <View style={[styles.signal, styles.signalTwo]} />
        <View style={[styles.signal, styles.signalThree]} />
        <View style={[styles.signal, styles.signalFour]} />
      </View>

      <Text style={styles.title}>{copy.recents.emptyTitle}</Text>

      <Text style={styles.subtitle}>
        {copy.recents.emptyText}
      </Text>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.buttonTouch}
      >
        <LinearGradient
          colors={Colors.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Ionicons name="call" size={22} color={COLORS.white} />
          <Text style={styles.buttonText}>{copy.home.randomMatch}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default EmptyState;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  illustration: {
    width: 260,
    height: 255,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOne: {
    position: 'absolute',
    width: 230,
    height: 180,
    borderRadius: 100,
    backgroundColor: 'rgba(252,229,235,0.62)',
    transform: [{ rotate: '-14deg' }],
  },
  glowTwo: {
    position: 'absolute',
    width: 155,
    height: 190,
    right: 12,
    borderRadius: 86,
    backgroundColor: 'rgba(255,229,237,0.72)',
    transform: [{ rotate: '25deg' }],
  },
  historySheet: {
    width: 125,
    height: 157,
    marginLeft: -24,
    borderRadius: 12,
    alignItems: 'center',
    paddingTop: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
    transform: [{ rotate: '5deg' }],
  },
  clockCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: Colors.accent,
    backgroundColor: Colors.primaryLight,
  },
  sheetLineLong: {
    width: 72,
    height: 7,
    marginTop: 19,
    borderRadius: 4,
    backgroundColor: COLORS.line,
  },
  sheetLineShort: {
    width: 61,
    height: 7,
    marginTop: 11,
    borderRadius: 4,
    backgroundColor: COLORS.line,
  },
  phoneBubble: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },
  bubbleTail: {
    position: 'absolute',
    right: 11,
    bottom: -7,
    width: 23,
    height: 23,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '35deg' }],
  },
  signal: {
    position: 'absolute',
    width: 5,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  signalOne: {
    height: 22,
    left: 37,
    top: 50,
    transform: [{ rotate: '-45deg' }],
  },
  signalTwo: {
    height: 26,
    left: 64,
    top: 29,
  },
  signalThree: {
    height: 22,
    right: 19,
    bottom: 87,
    transform: [{ rotate: '31deg' }],
  },
  signalFour: {
    height: 13,
    right: 2,
    bottom: 72,
    transform: [{ rotate: '52deg' }],
  },
  title: {
    marginTop: 10,
    color: COLORS.navy,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 9,
    color: COLORS.body,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
  },
  buttonTouch: {
    marginTop: 22,
    borderRadius: 19,
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    elevation: 5,
  },
  button: {
    width: 176,
    height: 55,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    marginLeft: 12,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
