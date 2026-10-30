import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import UI from '../../constants/ui';

export default StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    backgroundColor: Colors.background,
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
    paddingHorizontal: UI.spacing.lg,
    paddingBottom: 16,
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
    fontSize: UI.typography.screenTitle,
    fontWeight: '600',
    color: Colors.text,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: Colors.subText,
    lineHeight: 22,
  },

  count: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },

  card: {
    padding: 18,

    marginBottom: 18,
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

    backgroundColor: Colors.primary,

    justifyContent: 'center',

    alignItems: 'center',

    flexDirection: 'row',

    paddingHorizontal: 20,
  },
  callButtonDisabled: {
    opacity: 0.6,
  },

  callText: {
    color: Colors.secondary,

    fontWeight: '700',

    marginLeft: 8,
  },
});
