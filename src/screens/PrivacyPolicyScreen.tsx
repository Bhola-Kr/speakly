import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '../constants/colors';

const Section = ({ title, children }: any) => (
  <View style={styles.section}>
    <Text style={styles.heading}>{title}</Text>
    <Text style={styles.body}>{children}</Text>
  </View>
);

const PrivacyPolicyScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Privacy Policy</Text>

        <Text style={styles.updated}>Last Updated: July 2026</Text>

        <Text style={styles.intro}>
          Welcome to VoiceTamil. Your privacy is important to us. This Privacy
          Policy explains how we collect, use, protect, and manage your
          information while you use our application.
        </Text>

        <Section title="1. Information We Collect">
          • Mobile Number{'\n'}• Firebase User ID{'\n'}• Nickname & Avatar{'\n'}
          • Language Preference{'\n'}• Wallet Balance & Transaction History
          {'\n'}• Call History{'\n'}• Device Information{'\n'}• App Analytics &
          Crash Reports
        </Section>

        <Section title="2. How We Use Your Information">
          Your information helps us provide voice calling, maintain your wallet,
          improve app performance, prevent fraud, verify users, and offer
          customer support.
        </Section>

        <Section title="3. Voice Calls">
          VoiceTamil does not record or store the content of your voice
          conversations unless explicitly stated in the application.
        </Section>

        <Section title="4. Wallet & Payments">
          Wallet payments are securely processed through trusted third-party
          payment gateways. We never store your card, UPI PIN, or banking
          credentials.
        </Section>

        <Section title="5. Permissions">
          VoiceTamil may request access to:
          {'\n\n'}• Microphone{'\n'}• Notifications{'\n'}• Internet Connection
        </Section>

        <Section title="6. Data Security">
          We use commercially reasonable security measures to protect your
          information. However, no system can guarantee absolute security.
        </Section>

        <Section title="7. Data Sharing">
          We never sell your personal information. Data may be shared only with
          payment providers, cloud services, or legal authorities when required
          by law.
        </Section>

        <Section title="8. Account Deletion">
          You may request account deletion through the application. Once
          verified, your personal information will be permanently removed unless
          retention is required by applicable law.
        </Section>

        <Section title="9. Children's Privacy">
          VoiceTamil is intended only for users who are 18 years of age or
          older.
        </Section>

        <Section title="10. Changes to this Policy">
          We may update this Privacy Policy from time to time. Updated versions
          will be published inside the application.
        </Section>

        <Section title="11. Contact Us">
          Email:{'\n'}
          tamizhkuralhelp@gmail.com
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 VoiceTamil. All Rights Reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },

  updated: {
    fontSize: 14,
    color: Colors.subText,
    marginBottom: 20,
  },

  intro: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 24,
  },

  section: {
    marginBottom: 24,
  },

  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 10,
  },

  body: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 26,
  },

  footer: {
    marginTop: 20,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 13,
    color: Colors.subText,
  },
});

export default PrivacyPolicyScreen;
