import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import UI from '../../constants/ui';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    paddingHorizontal: UI.spacing.lg,
    paddingBottom: 120,
  },

  header: {
    minHeight: 48,
    marginTop: 6,
    marginBottom: 18,

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',
  },

  title: {
    fontSize: UI.typography.screenTitle,
    fontWeight: '600',
    color: Colors.text,
  },

  wallet: {
    height: 42,

    borderRadius: 21,

    backgroundColor: Colors.primary,

    paddingHorizontal: 16,

    flexDirection: 'row',

    alignItems: 'center',
  },

  walletText: {
    color: Colors.white,

    fontWeight: '700',

    marginHorizontal: 8,
  },

  walletCoin: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  walletBalanceText: {
    color: Colors.white,
    fontWeight: '700',
    marginHorizontal: 8,
  },

  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  plus: {
    width: 22,

    height: 22,

    borderRadius: 11,

    backgroundColor: Colors.secondary,

    justifyContent: 'center',

    alignItems: 'center',
  },

  profileCard: {
    backgroundColor: Colors.white,

    borderRadius: UI.radius.card,

    padding: 22,

    borderWidth: 1,
    borderColor: Colors.border,
    ...UI.shadow.card,
  },

  avatar: {
    width: 110,

    height: 110,

    borderRadius: 55,

    alignSelf: 'center',
  },

  tamilName: {
    marginTop: 18,

    textAlign: 'center',

    fontSize: 24,

    fontWeight: '700',

    color: Colors.text,
  },

  phoneRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  phoneNumber: {
    color: Colors.subText,
    fontSize: 14,
    marginLeft: 6,
  },

  englishName: {
    marginTop: 6,

    textAlign: 'center',

    fontSize: 17,

    color: Colors.subText,
  },

  memberSince: {
    marginTop: 6,

    textAlign: 'center',

    color: Colors.subText,
  },

  buttonRow: {
    marginTop: 24,

    flexDirection: 'row',
  },

  outlineButton: {
    flex: 1,

    height: 48,

    borderRadius: UI.radius.button,

    borderWidth: 1,

    borderColor: Colors.primary,

    flexDirection: 'row',
    justifyContent: 'center',

    alignItems: 'center',
  },

  primaryButton: {
    flex: 1,

    height: 48,

    borderRadius: UI.radius.button,

    backgroundColor: Colors.primary,

    flexDirection: 'row',
    justifyContent: 'center',

    alignItems: 'center',

    marginLeft: 14,
  },

  outlineText: {
    color: Colors.primary,

    fontWeight: '700',
    marginLeft: UI.spacing.sm,
  },

  primaryText: {
    color: Colors.white,

    fontWeight: '700',
    marginLeft: UI.spacing.sm,
  },

  callTimeCard: {
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  callTimeIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },

  callTimeContent: {
    flex: 1,
    marginLeft: 12,
  },

  callTimeLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  callTimeDescription: {
    color: Colors.subText,
    fontSize: 12,
    marginTop: 3,
  },

  callTimeValue: {
    color: Colors.secondary,
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
  },

  sectionTitle: {
    marginTop: 26,

    marginBottom: 12,

    fontSize: UI.typography.sectionHeading,

    fontWeight: '600',

    color: Colors.text,
  },

  menuCard: {
    backgroundColor: Colors.white,

    borderRadius: UI.radius.card,

    borderWidth: 1,
    borderColor: Colors.border,

    overflow: 'hidden',

    ...UI.shadow.card,
  },
  menuRow: {
    minHeight: 68,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  menuIcon: {
    width: 40,

    height: 40,

    borderRadius: 14,

    backgroundColor: Colors.surface,

    justifyContent: 'center',

    alignItems: 'center',

    marginRight: 14,
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    fontSize: UI.typography.body,

    fontWeight: '600',

    color: Colors.text,
  },

  menuValue: {
    marginTop: 2,

    fontSize: 13,

    color: Colors.subText,
  },

  divider: {
    height: 1,

    backgroundColor: Colors.divider,

    marginLeft: 70,
  },

  footer: {
    alignItems: 'center',

    marginTop: 40,

    marginBottom: 30,
  },

  footerTitle: {
    marginTop: 12,

    color: Colors.text,

    fontWeight: '700',

    fontSize: 16,
  },

  footerVersion: {
    marginTop: 5,

    color: Colors.subText,
  },
});
