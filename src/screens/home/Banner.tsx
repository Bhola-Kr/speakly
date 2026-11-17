import { TouchableOpacity } from '../../localization/components';
import { Text } from '../../localization/components';
import React, { memo } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Text as NativeText,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/colors';
import { copy } from '../../constants/strings';

const COLORS = {
  navy: Colors.textPrimary,
  teal: Colors.primary,
  tealDark: Colors.primaryPressed,
  body: Colors.textSecondary,
  white: Colors.textOnPrimary,
};

interface Props {
  randomCall: () => void;
  calling: boolean;
  title: string;
  subtitle: string;
}

const Banner = ({ randomCall, calling, title, subtitle }: Props) => {
  return (
    <View style={styles.bannerShadow}>
      <LinearGradient
        colors={[Colors.surface, Colors.surfaceSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View pointerEvents="none" style={styles.illustrationWrap}>
          <View style={styles.illustrationHalo} />
          <Image
            source={require('../../assets/call-waiting-illustration.png')}
            resizeMode="contain"
            style={styles.illustration}
          />
        </View>

        <View style={styles.copy}>
          <NativeText
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={styles.title}
          >
            {title}
          </NativeText>

          <NativeText
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={styles.description}
          >
            {subtitle}
          </NativeText>

          <TouchableOpacity
            onPress={randomCall}
            activeOpacity={0.9}
            disabled={calling}
            style={[styles.button, calling && styles.buttonDisabled]}
          >
            {calling ? (
              <>
                <ActivityIndicator size="small" color={COLORS.white} />

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  style={styles.buttonText}
                >
                  {copy.call.connecting}
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="phone"
                  size={22}
                  color={COLORS.white}
                />

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  style={styles.buttonText}
                >
                  {copy.home.randomMatch}
                </Text>
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
    marginHorizontal: 16,
    marginTop: 7,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  banner: {
    minHeight: 136,
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  illustrationWrap: {
    width: 104,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 22,
  },
  illustrationHalo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 225, 235, 0.9)',
  },
  illustration: {
    width: 104,
    height: 108,
  },
  copy: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
    zIndex: 2,
  },
  title: {
    color: COLORS.navy,
    fontSize: 18,
    lineHeight: 23,
    paddingTop: 2,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  description: {
    color: COLORS.body,
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 1,
    marginTop: 2,
  },
  button: {
    marginTop: 8,
    backgroundColor: COLORS.tealDark,
    height: 40,
    borderRadius: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
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
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 19,
    paddingTop: 1,
    marginLeft: 6,
  },
});
