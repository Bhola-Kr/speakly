import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
  },

  header: {
    alignItems: 'center',
    marginTop: 18,
  },

  logo: {
    fontSize: 34,
    fontWeight: '700',
    color: '#D4AF37',
    letterSpacing: 1,
  },

  title: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },

  subTitle: {
    marginTop: 8,
    color: '#94A3B8',
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
    backgroundColor: 'rgba(212,175,55,.15)',
  },

  avatarBorder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
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
    color: '#FFFFFF',
  },

  city: {
    marginTop: 8,
    fontSize: 16,
    color: '#94A3B8',
  },

  secureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#182234',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
  },

  secureText: {
    color: '#00E676',
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
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },

  accept: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  swipeCard: {
    marginTop: 35,
    backgroundColor: '#182234',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },

  swipeText: {
    color: '#D4AF37',
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
    backgroundColor: '#D4AF37',
  },
});
