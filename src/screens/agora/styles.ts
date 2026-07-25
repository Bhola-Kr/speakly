import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarOuter: {
    width: 210,
    height: 210,
    borderRadius: 105,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2b2b2b',
  },

  avatar: {
    width: 190,
    height: 190,
    borderRadius: 95,
  },

  name: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
    marginTop: 20,
  },

  city: {
    color: '#C5C5C5',
    marginTop: 8,
    fontSize: 16,
  },

  statusContainer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: '#00E676',
  },

  status: {
    color: '#fff',
    fontWeight: '600',
  },

  timer: {
    color: '#D4AF37',
    fontSize: 50,
    fontWeight: '700',
    marginTop: 35,
  },

  wallet: {
    width: width - 40,
    backgroundColor: '#1D1D1D',
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
    color: '#888',
    fontSize: 13,
  },

  walletValue: {
    color: '#D4AF37',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 5,
  },

  controls: {
    paddingBottom: 40,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 35,
  },

  controlItem: {
    alignItems: 'center',
  },

  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#242424',
  },

  controlText: {
    color: '#fff',
    marginTop: 10,
    fontWeight: '600',
  },

  endButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },

  endText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
});
