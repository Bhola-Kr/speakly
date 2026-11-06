import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import UI from '../../constants/ui';

export default StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Colors.background,
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
    backgroundColor: 'rgba(252,229,235,0.48)',
  },
  backgroundWaveLeft: {
    position: 'absolute',
    bottom: -145,
    left: -160,
    width: 420,
    height: 330,
    borderRadius: 190,
    backgroundColor: 'rgba(255,229,237,0.58)',
    transform: [{ rotate: '24deg' }],
  },
  backgroundWaveRight: {
    position: 'absolute',
    bottom: -185,
    right: -210,
    width: 420,
    height: 360,
    borderRadius: 200,
    backgroundColor: 'rgba(252,229,235,0.66)',
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
    color: Colors.textPrimary,
  },

  subtitle: {
    marginTop: 1,
    fontSize: UI.typography.secondary,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  count: {
    marginLeft: 9,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },

  card: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
    borderRadius: 22,
    borderColor: Colors.primaryLight,
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryLight,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarDotOuter: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  avatarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  info: {
    flex: 1,

    marginLeft: 12,
    minWidth: 0,
  },

  tamilName: {
    fontSize: 18,
    lineHeight: 23,

    fontWeight: '800',

    color: Colors.text,
  },

  englishName: {
    fontSize: 13,
    lineHeight: 17,

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
    marginTop: 5,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 6,
    backgroundColor: Colors.subText,
  },
  cardChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
  },
  cardLanguageChip: {
    maxWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
  },
  cardLanguageText: {
    flexShrink: 1,
    marginLeft: 5,
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  cardStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 15,
  },
  cardStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  cardStatusText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '800',
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.onlineStatus,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.onlineStatus,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  callButtonDisabled: {
    opacity: 0.6,
  },
  cardActions: {
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: Colors.coinSurface,
  },
  cardRateValue: {
    color: Colors.coinText,
    fontSize: 17,
    fontWeight: '900',
  },
  cardRateUnit: {
    color: Colors.coinText,
    fontSize: 11,
    fontWeight: '700',
  },

});
