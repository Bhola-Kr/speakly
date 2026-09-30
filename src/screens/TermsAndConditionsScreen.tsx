import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '../constants/colors';

const Section = ({ title, children }: any) => (
  <View style={styles.section}>
    <Text style={styles.heading}>{title}</Text>
    <Text style={styles.body}>{children}</Text>
  </View>
);

const TermsAndConditionsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Terms & Conditions</Text>

        <Text style={styles.updated}>Last Updated: July 2026</Text>

        <Text style={styles.intro}>
          By creating an account or using VoiceTamil, you agree to these Terms &
          Conditions. The app's services, products, and whole functionality are
          managed and run by COZYDS LLP.
        </Text>

        <Section title="1. Eligibility">
          Users must be at least 18 years old to use VoiceTamil.
        </Section>

        <Section title="2. User Account">
          You are responsible for maintaining the security of your account and
          all activities performed using your account.
        </Section>

        <Section title="3. Wallet">
          Wallet balances are intended solely for use within VoiceTamil and
          cannot be transferred to another user or exchanged for cash except
          where required by law.
        </Section>

        <Section title="4. Payments">
          Payments are processed by trusted third-party payment providers.
          VoiceTamil is not responsible for payment gateway downtime or banking
          issues.
        </Section>

        <Section title="5. Refund Policy">
          Wallet recharges are generally non-refundable after successful credit.
          Refund requests are reviewed only for duplicate payments, technical
          failures, or other exceptional situations.
        </Section>

        <Section title="6. Acceptable Use">
          Users must not:
          {'\n\n'}• Harass others{'\n'}• Use fake identities{'\n'}• Attempt
          unauthorized access{'\n'}• Engage in illegal activity{'\n'}• Abuse the
          platform
        </Section>

        <Section title="7. Account Suspension">
          VoiceTamil reserves the right to suspend or terminate accounts
          involved in fraud, abuse, or violations of these Terms.
        </Section>

        <Section title="8. Intellectual Property">
          All trademarks, logos, application designs, source code, graphics, and
          branding belong exclusively to VoiceTamil.
        </Section>

        <Section title="9. Service Availability">
          We strive to provide uninterrupted service but cannot guarantee
          continuous availability at all times.
        </Section>

        <Section title="10. Limitation of Liability">
          VoiceTamil is provided on an "as is" basis. We are not liable for
          indirect or consequential damages arising from use of the application.
        </Section>

        <Section title="11. Account Deletion">
          Users may request permanent account deletion through the application.
          Personal data will be removed in accordance with applicable laws and
          our Privacy Policy.
        </Section>

        <Section title="12. Changes to Terms">
          These Terms may be updated periodically. Continued use of VoiceTamil
          after updates constitutes acceptance of the revised Terms.
        </Section>

        <Section title="13. Governing Law">
          These Terms shall be governed by the laws of India.
        </Section>

        <Section title="14. Contact Us">tamizhkuralhelp@gmail.com</Section>

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

export default TermsAndConditionsScreen;
