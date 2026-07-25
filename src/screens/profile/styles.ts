import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  header: {
    marginTop: 10,
    marginBottom: 20,

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',
  },

  title: {
    fontSize: 30,

    fontWeight: '700',

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

  plus: {
    width: 22,

    height: 22,

    borderRadius: 11,

    backgroundColor: Colors.secondary,

    justifyContent: 'center',

    alignItems: 'center',
  },

  profileCard: {
    backgroundColor: Colors.card,

    borderRadius: 24,

    padding: 22,

    shadowColor: '#000',

    shadowOpacity: 0.08,

    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 5,
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

    borderRadius: 24,

    borderWidth: 1,

    borderColor: Colors.primary,

    justifyContent: 'center',

    alignItems: 'center',
  },

  primaryButton: {
    flex: 1,

    height: 48,

    borderRadius: 24,

    backgroundColor: Colors.primary,

    justifyContent: 'center',

    alignItems: 'center',

    marginLeft: 14,
  },

  outlineText: {
    color: Colors.primary,

    fontWeight: '700',
  },

  primaryText: {
    color: Colors.secondary,

    fontWeight: '700',
  },

  sectionTitle: {
    marginTop: 28,

    marginBottom: 12,

    fontSize: 20,

    fontWeight: '700',

    color: Colors.text,
  },

  menuCard: {
    backgroundColor: Colors.card,

    borderRadius: 22,

    overflow: 'hidden',

    shadowColor: '#000',

    shadowOpacity: 0.06,

    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 4,
  },
  menuRow: {
    height: 62,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 18,
  },

  menuIcon: {
    width: 42,

    height: 42,

    borderRadius: 21,

    backgroundColor: Colors.surface,

    justifyContent: 'center',

    alignItems: 'center',

    marginRight: 14,
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 16,

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

    marginLeft: 74,
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
