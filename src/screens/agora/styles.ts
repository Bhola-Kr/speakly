import Colors from '../../constants/colors';
import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBackground,
  },

  safeArea: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  safetyPlaceholder: {
    width: 25,
    height: 25,
  },

  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarOuter: {
    width: 176,
    height: 176,
    borderRadius: 88,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkAvatarSurface,
  },

  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },

  name: {
    color: Colors.white,
    fontSize: 25,
    fontWeight: '700',
    marginTop: 14,
    maxWidth: width - 48,
  },

  englishName: {
    color: Colors.darkTextMuted,
    fontSize: 14,
    marginTop: 4,
    maxWidth: width - 48,
  },

  city: {
    color: Colors.darkTextMuted,
    marginTop: 8,
    fontSize: 16,
  },

  statusContainer: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkSurfaceMuted,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 25,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: Colors.online,
  },

  status: {
    color: Colors.white,
    fontWeight: '600',
  },

  callerBalance: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkSurfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  callerBalanceCompact: {
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  callerBalanceLabel: {
    color: Colors.darkTextMuted,
    fontSize: 12,
    marginLeft: 6,
  },

  callerBalanceValue: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },

  callDurationLabel: {
    color: Colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 18,
  },

  callDurationLabelCompact: {
    marginTop: 8,
  },

  timer: {
    color: Colors.secondary,
    fontSize: 42,
    fontWeight: '700',
    marginTop: 22,
  },

  headerCompact: {
    paddingTop: 8,
    paddingHorizontal: 14,
  },

  headerTitleCompact: {
    fontSize: 14,
  },

  avatarContainerCompact: {
    paddingVertical: 6,
  },

  avatarOuterCompact: {
    width: 132,
    height: 132,
    borderRadius: 66,
  },

  avatarCompact: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  nameCompact: {
    fontSize: 20,
    marginTop: 8,
  },

  englishNameCompact: {
    fontSize: 12,
    marginTop: 2,
  },

  statusContainerCompact: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  timerCompact: {
    fontSize: 32,
    marginTop: 10,
  },

  lowBalancePopup: {
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 16,
    backgroundColor: Colors.darkSurfaceCard,
    borderWidth: 1,
    borderColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },

  lowBalancePopupCompact: {
    marginHorizontal: 10,
    marginBottom: 10,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 4,
  },

  lowBalanceCopy: {
    flex: 1,
    marginLeft: 10,
  },

  lowBalanceTitle: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  lowBalanceMessage: {
    color: Colors.darkTextMuted,
    fontSize: 12,
    marginTop: 2,
  },

  addBalanceButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginLeft: 8,
  },

  addBalanceText: {
    color: Colors.darkBackground,
    fontSize: 13,
    fontWeight: '800',
  },

  dismissBalanceButton: {
    padding: 7,
  },

  wallet: {
    width: width - 40,
    backgroundColor: Colors.darkSurfaceCard,
    borderRadius: 20,
    marginTop: 35,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },

  walletItem: {
    alignItems: 'center',
  },

  walletTitle: {
    color: Colors.gray136,
    fontSize: 13,
  },

  walletValue: {
    color: Colors.secondary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 5,
  },

  controls: {
    paddingBottom: 24,
  },

  controlsCompact: {
    paddingBottom: 10,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 24,
  },

  rowCompact: {
    marginBottom: 12,
  },

  controlItem: {
    alignItems: 'center',
  },

  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkSurfaceMuted,
  },

  controlButtonCompact: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },

  controlText: {
    color: Colors.white,
    marginTop: 10,
    fontWeight: '600',
  },

  endButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },

  endButtonCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  endText: {
    color: Colors.white,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
});
