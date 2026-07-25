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

  status: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },

  statusSub: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 15,
  },

  body: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },

  avatarWrapper: {
    width: 240,
    height: 240,
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },

  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(212,175,55,.12)',
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
    marginTop: 24,
    fontSize: 34,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  city: {
    marginTop: 6,
    fontSize: 16,
    color: '#94A3B8',
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
    borderColor: '#D4AF37',
  },

  phoneButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },

  callingText: {
    marginTop: 22,
    color: '#CBD5E1',
    fontSize: 16,
  },

  footer: {
    backgroundColor: '#182234',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 18,
  },

  footerText: {
    flex: 1,
    marginLeft: 12,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },

  endButton: {
    width: width - 48,
    height: 58,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 28,
  },

  endText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
