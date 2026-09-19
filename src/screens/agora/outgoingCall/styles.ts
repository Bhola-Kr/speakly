import Colors from '../../../constants/colors';
import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
    paddingHorizontal: 24,
  },

  header: {
    alignItems: 'center',
    marginTop: 18,
  },

  logo: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 1,
  },

  status: {
    marginTop: 8,
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
  },

  statusSub: {
    marginTop: 6,
    color: Colors.slate,
    fontSize: 15,
  },

  statusTamilName: {
    color: Colors.slateLight,
    fontWeight: '700',
  },

  statusEnglishName: {
    color: Colors.slate,
    fontWeight: '400',
  },

  body: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },

  avatarWrapper: {
    width: 200,
    height: 200,
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },

  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.overlayGold12,
  },

  avatarBorder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.navySurface,
  },

  avatar: {
    width: 188,
    height: 188,
    borderRadius: 94,
  },

  name: {
    marginTop: 24,
    fontSize: 34,
    color: Colors.white,
    fontWeight: '700',
  },

  englishName: {
    marginTop: 4,
    fontSize: 17,
    color: Colors.slate,
  },

  city: {
    marginTop: 6,
    fontSize: 16,
    color: Colors.slate,
  },

  waveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  ripple: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },

  phoneButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },

  callingText: {
    marginTop: 22,
    color: Colors.slateLight,
    fontSize: 16,
  },

  footer: {
    backgroundColor: Colors.navyCard,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 18,
  },

  footerText: {
    flex: 1,
    marginLeft: 12,
    color: Colors.white,
    fontSize: 14,
    lineHeight: 20,
  },

  endButton: {
    width: width - 48,
    height: 58,
    borderRadius: 30,
    backgroundColor: Colors.errorBright,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 28,
  },

  endText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
