import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../constants/colors';
import { faqs } from '../constants/constants';

const FAQScreen = () => {
  const [expanded, setExpanded] = useState<number | null>(1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Frequently Asked Questions</Text>

        <Text style={styles.subtitle}>
          Find answers to the most commonly asked questions about VoiceTamil.
        </Text>

        {faqs.map(item => {
          const open = expanded === item.id;

          return (
            <View key={item.id} style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.header}
                onPress={() => setExpanded(open ? null : item.id)}
              >
                <Text style={styles.question}>{item.question}</Text>

                <MaterialCommunityIcons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={Colors.secondary}
                />
              </TouchableOpacity>

              {open && <Text style={styles.answer}>{item.answer}</Text>}
            </View>
          );
        })}

        <View style={styles.helpCard}>
          <MaterialCommunityIcons
            name="headset"
            size={44}
            color={Colors.secondary}
          />

          <Text style={styles.helpTitle}>Still need help?</Text>

          <Text style={styles.helpText}>
            If you couldn't find the answer you're looking for, please contact
            our support team.
          </Text>

          <Text style={styles.email}>tamizhkuralhelp@gmail.com</Text>
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
  },

  subtitle: {
    fontSize: 15,
    color: Colors.subText,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    marginBottom: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: Colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    paddingRight: 12,
  },

  answer: {
    marginTop: 14,
    fontSize: 15,
    color: Colors.subText,
    lineHeight: 24,
  },

  helpCard: {
    marginTop: 18,
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },

  helpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },

  helpText: {
    marginTop: 8,
    textAlign: 'center',
    color: Colors.subText,
    lineHeight: 22,
  },

  email: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
});

export default FAQScreen;
