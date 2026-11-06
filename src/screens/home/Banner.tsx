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
    <View style={styles.bannerShadow}>
      <LinearGradient
        colors={['#FFFFFF', '#E9FCF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View pointerEvents="none" style={styles.iconBubble}>
          <MaterialCommunityIcons
            name="account-voice"
            size={35}
            color={COLORS.tealDark}
          />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>Speak. Practice. Improve.</Text>

          <Text style={styles.description}>
            Start a live voice session now.
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

                <Text style={styles.buttonText}>Start now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

export default memo(Banner);

const styles = StyleSheet.create({
  bannerShadow: {
    marginHorizontal: 14,
    marginTop: 6,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  banner: {
    minHeight: 104,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0F3EF',
  },
  copy: {
    flex: 1,
    marginLeft: 12,
    zIndex: 2,
  },
  title: {
    color: COLORS.navy,
    fontSize: 20,
    lineHeight: 27,
    paddingTop: 2,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  description: {
    color: COLORS.body,
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 1,
    marginTop: 2,
  },
  button: {
    marginTop: 7,
    backgroundColor: COLORS.tealDark,
    height: 34,
    borderRadius: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 112,
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
    fontSize: 14,
    lineHeight: 19,
    paddingTop: 1,
    marginLeft: 6,
  },
  iconBubble: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.mintSoft,
    borderWidth: 1,
    borderColor: COLORS.mint,
  },
});
