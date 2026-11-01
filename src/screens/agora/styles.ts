import Colors from '../../constants/colors';
import UI from '../../constants/ui';
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

  callerDecorations: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },

  callerGlowTop: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    right: -120,
    top: 45,
    backgroundColor: 'rgba(83, 226, 205, 0.16)',
  },

  callerGlowBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -150,
    bottom: 80,
    backgroundColor: 'rgba(91, 220, 201, 0.11)',
  },

  header: {
    paddingHorizontal: UI.spacing.lg,
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

  headerCaller: {
    paddingTop: 10,
  },

  headerTitleCaller: {
    color: '#071A2D',
    fontSize: 17,
    fontWeight: '800',
  },

  headerActionCaller: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: '#D9F0EC',
    shadowColor: '#078A7D',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
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

  avatarContainerCaller: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },

  avatarOuter: {
    width: 176,
    height: 176,
    borderRadius: 88,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkAvatarSurface,
  },

  avatarOuterCaller: {
    width: 204,
    height: 204,
    borderRadius: 102,
    padding: 7,
    borderWidth: 10,
    borderColor: 'rgba(177,246,235,0.55)',
    shadowColor: '#08A991',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },

  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },

  avatarCaller: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 5,
    borderColor: Colors.white,
  },

  currentUserAvatarBadge: {
    position: 'absolute',
    right: -8,
    bottom: 4,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: '#071A2D',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  currentUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  currentUserOnlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#19BE72',
    borderWidth: 2,
    borderColor: Colors.white,
  },

  callDetails: {
    alignItems: 'center',
  },

  callDetailsCaller: {
    width: '100%',
    maxWidth: 430,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },

  name: {
    color: Colors.white,
    fontSize: 25,
    fontWeight: '700',
    marginTop: 14,
    maxWidth: width - 48,
  },

  nameCaller: {
    color: '#071A2D',
    marginTop: 0,
    fontSize: 27,
    fontWeight: '900',
  },

  englishName: {
    color: Colors.darkTextMuted,
    fontSize: 14,
    marginTop: 4,
    maxWidth: width - 48,
  },

  englishNameCaller: {
    color: '#727A90',
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

  statusContainerCaller: {
    marginTop: 9,
    backgroundColor: '#E1FAF5',
    paddingHorizontal: 15,
    paddingVertical: 7,
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

  statusCaller: {
    color: '#078A7D',
    fontWeight: '800',
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

  callDurationLabelCaller: {
    color: '#727A90',
    marginTop: 12,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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

  timerCaller: {
    color: '#071A2D',
    marginTop: 5,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1,
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
    paddingHorizontal: UI.spacing.xl,
    paddingBottom: UI.spacing.lg,
  },

  controlsCaller: {
    marginHorizontal: 18,
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#DDF1ED',
    shadowColor: '#078A7D',
    shadowOpacity: 0.11,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },

  controlsCompact: {
    paddingBottom: 10,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: UI.spacing.xl,
    marginBottom: UI.spacing.lg,
  },

  rowCompact: {
    marginBottom: 12,
  },

  controlItem: {
    alignItems: 'center',
    width: 96,
  },

  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkSurfaceMuted,
  },

  controlButtonCaller: {
    backgroundColor: '#E1FAF5',
    borderWidth: 1,
    borderColor: '#D3F2EC',
  },

  controlButtonActive: {
    backgroundColor: Colors.secondary,
  },

  controlButtonActiveCaller: {
    backgroundColor: '#08A991',
    borderColor: '#08A991',
  },

  controlButtonCompact: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },

  controlText: {
    color: Colors.white,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  controlTextCaller: {
    color: '#071A2D',
    fontWeight: '700',
  },

  endButtonCaller: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4535E',
    shadowColor: '#B83845',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  endButtonCallerText: {
    marginLeft: 10,
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },

  endButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },

  endButtonCompact: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },

  endText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
});
