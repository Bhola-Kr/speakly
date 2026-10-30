import Colors from '../../../constants/colors';
import UI from '../../../constants/ui';
import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
    paddingHorizontal: UI.spacing.lg,
  },

  header: {
    alignItems: 'center',
    marginTop: 12,
  },

  headerCompact: {
    marginTop: UI.spacing.xs,
  },

  logo: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: Colors.secondary,
    letterSpacing: 1,
  },

  status: {
    marginTop: 12,
    color: Colors.white,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
  },

  statusSub: {
    marginTop: 6,
    color: Colors.slate,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
  },

  bodyCompact: {
    paddingVertical: UI.spacing.sm,
  },

  avatarWrapper: {
    width: 200,
    height: 200,
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarWrapperCompact: {
    width: 160,
    height: 160,
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

  avatarBorderCompact: {
    width: 152,
    height: 152,
    borderRadius: 76,
  },

  avatar: {
    width: 188,
    height: 188,
    borderRadius: 94,
  },

  avatarCompact: {
    width: 142,
    height: 142,
    borderRadius: 71,
  },

  name: {
    marginTop: 28,
    fontSize: 30,
    lineHeight: 38,
    color: Colors.white,
    fontWeight: '700',
  },

  nameCompact: {
    marginTop: UI.spacing.lg,
    fontSize: UI.typography.screenTitle,
    lineHeight: 31,
  },

  englishName: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.slate,
  },

  city: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.slate,
  },

  waveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },

  waveContainerCompact: {
    marginTop: UI.spacing.lg,
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
    borderRadius: UI.radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.overlayWhite15,
  },

  footerText: {
    flex: 1,
    marginLeft: 12,
    color: Colors.white,
    fontSize: 14,
    lineHeight: 20,
  },

  endButton: {
    width: width - UI.spacing.lg * 2,
    height: UI.size.primaryButtonHeight,
    borderRadius: UI.radius.button,
    backgroundColor: Colors.errorBright,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },

  endText: {
    color: Colors.white,
    fontSize: UI.typography.body,
    fontWeight: '700',
  },
});
