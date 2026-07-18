// styles.ts

import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

const PRIMARY = '#5B7CFF';
const TEXT = '#1A1A1A';
const SUBTEXT = '#7B7B7B';
const CARD = '#F8F9FE';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
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
    fontSize: 31,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.8,
  },

  subHeading: {
    marginTop: 10,
    fontSize: 16,
    color: SUBTEXT,
    lineHeight: 24,
  },

  quoteCard: {
    marginTop: 40,
    backgroundColor: CARD,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 28,

    borderWidth: 1,
    borderColor: '#EEF2FF',

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
    fontSize: 20,
    color: TEXT,
    lineHeight: 34,
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

    backgroundColor: '#E8EEFF',
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
    fontSize: 17,
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

    backgroundColor: '#FFECEC',

    borderWidth: 3,
    borderColor: '#FF5B5B',
  },

  failedIcon: {
    fontSize: 60,
    color: '#FF5B5B',
    fontWeight: '700',
  },

  failedTitle: {
    marginTop: 28,
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  failedSubtitle: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    lineHeight: 28,
    paddingHorizontal: 25,
  },

  skipButton: {
    marginTop: 18,
    paddingVertical: 12,
  },

  skipText: {
    color: '#888',
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
    color: '#FFFFFF',
    fontWeight: '800',
  },

  successTitle: {
    marginTop: 28,
    fontSize: 30,
    fontWeight: '800',
    color: TEXT,
  },

  successSubtitle: {
    marginTop: 12,
    textAlign: 'center',
    color: SUBTEXT,
    fontSize: 17,
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
    backgroundColor: '#FFFFFF',
  },

  verifyTitle: {
    marginTop: 30,
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
  },

  verifySubTitle: {
    marginTop: 10,
    fontSize: 16,
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
