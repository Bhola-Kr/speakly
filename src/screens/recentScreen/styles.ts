import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import UI from '../../constants/ui';

export default StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F7FFFE',
  },
  backgroundArt: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -150,
    right: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(219,250,245,0.40)',
  },
  backgroundWaveLeft: {
    position: 'absolute',
    bottom: -145,
    left: -160,
    width: 420,
    height: 330,
    borderRadius: 190,
    backgroundColor: 'rgba(224,251,247,0.54)',
    transform: [{ rotate: '24deg' }],
  },
  backgroundWaveRight: {
    position: 'absolute',
    bottom: -185,
    right: -210,
    width: 420,
    height: 360,
    borderRadius: 200,
    backgroundColor: 'rgba(231,252,249,0.66)',
    transform: [{ rotate: '-26deg' }],
  },

  content: {
    paddingHorizontal: UI.spacing.lg,
    paddingBottom: 110,
  },

  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  clearText: {
    marginTop: 2,
    fontSize: UI.typography.secondary,
    fontWeight: '600',
    color: Colors.danger,
  },

  sectionTitle: {
    fontSize: UI.typography.sectionHeading,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 18,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: {
    flex: 1,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  backPlaceholder: {
    width: 40,
    marginRight: 16,
  },

  title: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: '#071A2D',
  },

  subtitle: {
    marginTop: 1,
    fontSize: UI.typography.secondary,
    color: '#747B91',
    lineHeight: 18,
  },

  count: {
    marginLeft: 9,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#DFF9F4',
    fontSize: 13,
    fontWeight: '800',
    color: '#078A7D',
  },

  card: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
    borderRadius: UI.radius.card,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  spaceBetween: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },

  info: {
    flex: 1,

    marginLeft: 11,
    minWidth: 0,
  },

  tamilName: {
    fontSize: 19,

    fontWeight: '700',

    color: Colors.text,
  },

  englishName: {
    fontSize: 13,

    color: Colors.subText,

    marginTop: 1,
  },

  location: {
    marginTop: 3,

    color: Colors.subText,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 6,
    backgroundColor: Colors.subText,
  },
  compactStatus: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
  },

  label: {
    color: Colors.subText,

    fontSize: UI.typography.secondary,
  },
  receiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  receiveCoin: {
    marginTop: 3,
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 0,
  },

  value: {
    marginTop: 4,

    fontWeight: '700',

    color: Colors.text,

    fontSize: 16,
  },

  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  callButtonDisabled: {
    opacity: 0.6,
  },

});
