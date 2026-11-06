import Colors from '../constants/colors';
import UI from '../constants/ui';
// styles.ts

import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

const PRIMARY = Colors.blueBrand;
const TEXT = Colors.text;
const SUBTEXT = Colors.gray123;
const CARD = Colors.screenSurface;

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: UI.spacing.xl,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    marginTop: 10,
  },

  backText: {
    fontSize: 36,
    color: TEXT,
    fontWeight: '300',
  },

  heading: {
    marginTop: 15,
    fontSize: UI.typography.display,
    lineHeight: 38,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: -0.8,
  },

  subHeading: {
    marginTop: 10,
    fontSize: UI.typography.body,
    color: SUBTEXT,
    lineHeight: 24,
  },

  quoteCard: {
    marginTop: 28,
    backgroundColor: CARD,
    borderRadius: UI.radius.card,
    paddingHorizontal: 20,
    paddingVertical: 22,

    borderWidth: 1,
    borderColor: Colors.screenBorder,

    shadowColor: PRIMARY,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },

  quote: {
    textAlign: 'center',
    fontSize: UI.typography.sectionHeading,
    color: TEXT,
    lineHeight: 30,
    fontWeight: '700',
  },

  timer: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: 1,
  },

  glow: {
    position: 'absolute',
    bottom: 145,
    alignSelf: 'center',

    width: 140,
    height: 140,

    borderRadius: 70,

    backgroundColor: Colors.screenTint,
  },

  micButton: {
    alignSelf: 'center',

    width: 100,
    height: 100,

    borderRadius: 50,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: PRIMARY,

    shadowColor: PRIMARY,
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.35,
    shadowRadius: 18,

    elevation: 10,
  },

  mic: {
    fontSize: 40,
  },

  tapText: {
    marginTop: 22,
    textAlign: 'center',
    color: SUBTEXT,
    fontSize: UI.typography.body,
    fontWeight: '500',
  },

  successWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  failedCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: Colors.errorSurface,

    borderWidth: 3,
    borderColor: Colors.errorAccent,
  },

  failedIcon: {
    fontSize: 60,
    color: Colors.errorAccent,
    fontWeight: '700',
  },

  failedTitle: {
    marginTop: 28,
    fontSize: UI.typography.screenTitle,
    fontWeight: '900',
    color: Colors.text,
  },

  failedSubtitle: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: UI.typography.body,
    color: Colors.gray102,
    lineHeight: 28,
    paddingHorizontal: 25,
  },

  skipButton: {
    marginTop: 18,
    paddingVertical: 12,
  },

  skipText: {
    color: Colors.gray136,
    fontSize: 16,
    fontWeight: '600',
  },

  successCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: PRIMARY,

    shadowColor: PRIMARY,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,

    elevation: 8,
  },

  tick: {
    fontSize: 58,
    color: Colors.white,
    fontWeight: '800',
  },

  successTitle: {
    marginTop: 28,
    fontSize: UI.typography.screenTitle,
    fontWeight: '900',
    color: TEXT,
  },

  successSubtitle: {
    marginTop: 12,
    textAlign: 'center',
    color: SUBTEXT,
    fontSize: UI.typography.body,
    lineHeight: 26,
    paddingHorizontal: 35,
  },

  continueButton: {
    marginTop: 45,

    width: width - 80,
    height: 58,

    borderRadius: 30,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: PRIMARY,

    shadowColor: PRIMARY,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,

    elevation: 8,
  },

  continueText: {
    color: Colors.white,
    fontSize: UI.typography.body,
    fontWeight: '800',
  },

  //---------------------------------
  // Waveform
  //---------------------------------

  waveContainer: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  waveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  waveBar: {
    width: 6,
    marginHorizontal: 4,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },

  //---------------------------------
  // Verification Screen
  //---------------------------------

  verifyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: Colors.white,
  },

  verifyTitle: {
    marginTop: 30,
    fontSize: UI.typography.screenTitle,
    fontWeight: '900',
    color: TEXT,
  },

  verifySubTitle: {
    marginTop: 10,
    fontSize: UI.typography.body,
    textAlign: 'center',
    color: SUBTEXT,
    lineHeight: 25,
  },

  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
    marginTop: 45,
  },

  equalizerBar: {
    width: 8,
    marginHorizontal: 6,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
});
