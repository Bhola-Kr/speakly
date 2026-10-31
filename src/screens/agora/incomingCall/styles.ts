import Colors from '../../../constants/colors';
import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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

  title: {
    marginTop: 12,
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
  },

  subTitle: {
    marginTop: 8,
    color: Colors.subText,
    fontSize: 15,
  },

  body: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },

  avatarWrapper: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },

  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.surface,
  },

  avatarBorder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },

  avatar: {
    width: 188,
    height: 188,
    borderRadius: 94,
  },

  name: {
    marginTop: 22,
    fontSize: 34,
    fontWeight: '700',
    color: Colors.text,
  },

  city: {
    marginTop: 8,
    fontSize: 16,
    color: Colors.subText,
  },

  secureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
  },

  secureText: {
    color: Colors.online,
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 14,
  },

  bottom: {
    paddingBottom: 40,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },

  actionItem: {
    alignItems: 'center',
  },

  decline: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.errorBright,
    justifyContent: 'center',
    alignItems: 'center',
  },

  accept: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.successStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionText: {
    marginTop: 12,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  swipeCard: {
    marginTop: 35,
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },

  swipeText: {
    color: Colors.tealDark,
    fontWeight: '700',
    fontSize: 15,
  },

  waveContainer: {
    marginTop: 18,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  wave: {
    width: width * 0.55,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.secondary,
  },
});
