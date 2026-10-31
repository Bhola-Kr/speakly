import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const COLORS = {
  navy: '#071A2D',
  teal: '#08AA91',
  tealDark: '#078A7D',
  mint: '#BDF4E8',
  mintSoft: '#E6FBF6',
  body: '#747B91',
  white: '#FFFFFF',
};

interface Props {
  randomCall: () => void;
  calling: boolean;
}

const Banner = ({ randomCall, calling }: Props) => {
  return (
    <LinearGradient
      colors={['#FFFFFF', '#E9FCF8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}
    >
      <View style={styles.decorLine} />
      <View style={styles.artGlowOuter} />
      <View style={styles.artGlowInner} />
      <MaterialCommunityIcons
        name="account-voice"
        size={93}
        color={COLORS.tealDark}
        style={styles.artwork}
      />
      <MaterialCommunityIcons
        name="star-four-points"
        size={19}
        color="#52D8C4"
        style={styles.sparkleTop}
      />
      <MaterialCommunityIcons
        name="star-four-points"
        size={16}
        color="#16BBA4"
        style={styles.sparkleBottom}
      />

      <View style={styles.copy}>
        <Text style={styles.title}>
          Practice with{`\n`}
          <Text style={styles.titleAccent}>Language Experts</Text>
        </Text>

        <Text style={styles.description}>
          Pick a conversation topic and build fluency through a focused
          one-to-one voice session.
        </Text>

        <TouchableOpacity
          onPress={randomCall}
          activeOpacity={0.9}
          disabled={calling}
          style={[styles.button, calling && styles.buttonDisabled]}
        >
          {calling ? (
            <>
              <ActivityIndicator size="small" color={COLORS.white} />

              <Text style={styles.buttonText}>Connecting...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons
                name="phone"
                size={22}
                color={COLORS.white}
              />

              <Text style={styles.buttonText}>Find an expert</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default memo(Banner);

const styles = StyleSheet.create({
  banner: {
    minHeight: 212,
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingTop: 31,
    paddingBottom: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0F3EF',
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
  },
  copy: {
    width: '90%',
    zIndex: 2,
  },
  title: {
    color: COLORS.navy,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  titleAccent: {
    color: COLORS.tealDark,
  },
  description: {
    color: COLORS.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 9,
  },
  button: {
    marginTop: 14,
    backgroundColor: COLORS.tealDark,
    height: 46,
    borderRadius: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 157,
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 15,
    marginLeft: 10,
  },
  decorLine: {
    position: 'absolute',
    top: 22,
    left: 18,
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.tealDark,
  },
  artGlowOuter: {
    position: 'absolute',
    right: -35,
    top: 12,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(190,246,235,0.30)',
  },
  artGlowInner: {
    position: 'absolute',
    right: 0,
    top: 39,
    width: 135,
    height: 135,
    borderRadius: 68,
    backgroundColor: 'rgba(171,242,228,0.52)',
  },
  artwork: {
    position: 'absolute',
    right: -10,
    top: 63,
  },
  sparkleTop: {
    position: 'absolute',
    right: 112,
    top: 44,
  },
  sparkleBottom: {
    position: 'absolute',
    right: 102,
    top: 149,
  },
});
