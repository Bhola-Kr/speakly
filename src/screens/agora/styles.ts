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

  notesButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },

  notesButtonText: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  savedNoteCard: {
    width: width - 48,
    maxWidth: 420,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: UI.radius.card,
    backgroundColor: Colors.darkSurfaceCard,
    borderWidth: 1,
    borderColor: Colors.overlayGold18,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  savedNoteCopy: {
    flex: 1,
    marginLeft: 9,
  },

  savedNoteTitle: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  savedNoteDetails: {
    color: Colors.darkTextMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
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
    paddingHorizontal: UI.spacing.xl,
    paddingBottom: UI.spacing.lg,
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

  notesModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  notesBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  notesSheet: {
    maxHeight: '88%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: UI.radius.alert,
    borderTopRightRadius: UI.radius.alert,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    ...UI.shadow.modal,
  },

  notesHandle: {
    width: 72,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
    alignSelf: 'center',
    marginBottom: 24,
  },

  notesTitle: {
    color: Colors.text,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
  },

  notesDescription: {
    color: Colors.gray74,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 24,
  },

  notesFieldLabel: {
    color: Colors.text,
    backgroundColor: Colors.background,
    fontSize: 14,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: -9,
    paddingHorizontal: 8,
    zIndex: 1,
  },

  quickNoteInput: {
    height: 58,
    borderWidth: 1,
    borderColor: Colors.gray136,
    borderRadius: 29,
    color: Colors.text,
    fontSize: 16,
    paddingHorizontal: 20,
  },

  noteDetailsInput: {
    height: 150,
    borderWidth: 1,
    borderColor: Colors.gray136,
    borderRadius: 28,
    color: Colors.text,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  notesCount: {
    color: Colors.gray74,
    fontSize: 14,
    textAlign: 'right',
    marginTop: 7,
    marginBottom: 22,
    marginRight: 8,
  },

  saveNoteButton: {
    height: UI.size.primaryButtonHeight,
    borderRadius: UI.radius.button,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveNoteButtonDisabled: {
    backgroundColor: Colors.disabled,
  },

  saveNoteButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
});
