const UI = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { card: 16, button: 14, alert: 20 },
  size: { primaryButtonHeight: 52, icon: 24 },
  typography: {
    screenTitle: 24,
    sectionHeading: 18,
    body: 15,
    secondary: 13,
  },
  shadow: {
    card: {
      shadowColor: '#25204A',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
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
