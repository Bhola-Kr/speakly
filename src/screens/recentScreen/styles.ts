import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

export default StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    backgroundColor: Colors.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 18,
  },
  header: {
    paddingHorizontal: 24,
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
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  backPlaceholder: {
    width: 40,
    marginRight: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: '500',
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
    backgroundColor: Colors.white,

    borderRadius: 22,

    padding: 18,

    marginBottom: 18,

    shadowColor: '#000',

    shadowOpacity: 0.08,

    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 5,
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
    fontSize: 22,

    fontWeight: '700',

    color: Colors.text,
  },

  englishName: {
    fontSize: 16,

    color: Colors.text,

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
    height: 46,

    borderRadius: 23,

    backgroundColor: Colors.primary,

    justifyContent: 'center',

    alignItems: 'center',

    flexDirection: 'row',

    paddingHorizontal: 20,
  },

  callText: {
    color: Colors.secondary,

    fontWeight: '700',

    marginLeft: 8,
  },
});
