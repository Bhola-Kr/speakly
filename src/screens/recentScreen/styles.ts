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
    paddingBottom: 120,
  },

  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  clearText: {
    marginTop: 2,
    fontSize: 12,
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: '#071A2D',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#747B91',
    lineHeight: 22,
  },

  count: {
    alignSelf: 'flex-start',
    marginTop: 13,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#DFF9F4',
    fontSize: 13,
    fontWeight: '800',
    color: '#078A7D',
  },

  card: {
    padding: 18,
    marginBottom: 18,
    borderRadius: 24,
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
    width: 72,

    height: 72,

    borderRadius: 18,
  },

  info: {
    flex: 1,

    marginLeft: 14,
  },

  tamilName: {
    fontSize: UI.typography.sectionHeading,

    fontWeight: '700',

    color: Colors.text,
  },

  englishName: {
    fontSize: UI.typography.secondary,

    color: Colors.subText,

    marginTop: 3,
  },

  location: {
    marginTop: 3,

    color: Colors.subText,
  },

  divider: {
    height: 1,

    backgroundColor: Colors.border,

    marginVertical: 16,
  },
  metricsRow: {
    flexDirection: 'row',
  },
  metric: {
    flex: 1,
  },
  cardFooter: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },

  label: {
    color: Colors.subText,

    fontSize: 13,
  },
  receiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  receiveCoin: {
    marginTop: 5,
    width: 18,
    height: 18,
    resizeMode: 'none',
    marginRight: 4,
  },

  value: {
    marginTop: 4,

    fontWeight: '700',

    color: Colors.text,

    fontSize: 16,
  },

  callButton: {
    height: 44,

    borderRadius: UI.radius.button,

    backgroundColor: Colors.secondary,

    justifyContent: 'center',

    alignItems: 'center',

    flexDirection: 'row',

    paddingHorizontal: 20,
  },
  callButtonDisabled: {
    opacity: 0.6,
  },

  callText: {
    color: Colors.white,

    fontWeight: '700',

    marginLeft: 8,
  },
});
