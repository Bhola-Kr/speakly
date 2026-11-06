import Colors from './colors';

const UI = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { small: 10, chip: 14, card: 18, button: 16, alert: 24 },
  size: { primaryButtonHeight: 50, inputHeight: 54, icon: 24 },
  typography: {
    display: 32,
    screenTitle: 27,
    sectionHeading: 20,
    body: 16,
    secondary: 14,
    caption: 12,
  },
  shadow: {
    card: {
      shadowColor: Colors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    modal: {
      shadowColor: '#000000',
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
  },
} as const;

export default UI;
