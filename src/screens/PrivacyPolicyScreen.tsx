import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import Colors from '../constants/colors';

export const WEB_PAGES = {
  about: 'https://www.joinspeakly.com/how-it-works',
  privacy: 'https://www.joinspeakly.com/privacy-policy',
  terms: 'https://www.joinspeakly.com/terms-and-conditions',
} as const;

export const WebPageScreen = ({ url }: { url: string }) => (
  <WebView
    source={{ uri: url }}
    style={styles.webView}
    startInLoadingState
    renderLoading={() => (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    )}
    allowsBackForwardNavigationGestures
  />
);

const PrivacyPolicyScreen = () => <WebPageScreen url={WEB_PAGES.privacy} />;

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});

export default PrivacyPolicyScreen;
