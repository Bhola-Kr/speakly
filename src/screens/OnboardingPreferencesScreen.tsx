import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';
import { copy } from '../constants/strings';

export const ONBOARDING_LANGUAGES = [
  { name: 'English', nativeName: 'English' },
  { name: 'Hindi', nativeName: 'हिन्दी' },
  { name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { name: 'Tamil', nativeName: 'தமிழ்' },
  { name: 'Telugu', nativeName: 'తెలుగు' },
  { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { name: 'Malayalam', nativeName: 'മലയാളം' },
  { name: 'Bangla', nativeName: 'বাংলা' },
] as const;

const OnboardingPreferencesScreen = ({ navigation, route }: any) => {
  const existing = route.params?.existingProfile || {};
  const initialLanguages = Array.isArray(existing.supportedLanguages)
    ? existing.supportedLanguages
        .map((item: unknown) => String(item).trim())
        .filter(Boolean)
    : [];
  const [languages, setLanguages] = useState<string[]>(
    initialLanguages.length
      ? initialLanguages
      : [
          String(
            existing.practiceLanguage || existing.nativeLanguage || 'English',
          ),
        ],
  );
  const [role, setRole] = useState<'learner' | 'expert'>(
    existing.role === 'expert' ? 'expert' : 'learner',
  );
  const selectLanguage = (name: string) => {
    if (role !== 'expert') {
      setLanguages([name]);
      return;
    }
    setLanguages(current =>
      current.includes(name)
        ? current.length > 1
          ? current.filter(item => item !== name)
          : current
        : [...current, name],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.step}>STEP 2 OF 3</Text>
        <Text style={styles.title}>How would you like to join?</Text>
        <Text style={styles.subtitle}>
          Choose your conversation language and how you want to participate.
        </Text>

        <Text style={styles.heading}>I want to</Text>
        <View style={styles.roleRow}>
          {[
            {
              value: 'learner' as const,
              title: 'Join conversations',
              detail: 'Discover hosts and start calls',
              icon: 'account-voice',
              color: Colors.accent,
              softColor: Colors.accentLight,
              borderColor: Colors.border,
            },
            {
              value: 'expert' as const,
              title: copy.host.onboarding,
              detail: 'Go online and receive calls',
              icon: 'account-voice',
              color: Colors.primary,
              softColor: Colors.primaryLight,
              borderColor: Colors.border,
            },
          ].map(item => {
            const selected = role === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => {
                  setRole(item.value);
                  if (item.value === 'learner') {
                    setLanguages(current => [current[0] || 'English']);
                  }
                }}
                style={[
                  styles.roleCard,
                  {
                    backgroundColor: selected ? item.color : item.softColor,
                    borderColor: selected ? item.color : item.borderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={30}
                  color={selected ? Colors.white : item.color}
                />
                <Text
                  style={[
                    styles.roleTitle,
                    { color: selected ? Colors.white : item.color },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.roleDetail, selected && styles.whiteMuted]}
                >
                  {item.detail}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.heading}>
          {role === 'expert'
            ? 'Languages I can converse in'
            : 'Preferred conversation language'}
        </Text>
        {role === 'expert' ? (
          <Text style={styles.languageHelp}>
            Select one or more. Your voice verification will use your first
            selected language: {languages[0]}.
          </Text>
        ) : null}
        <View style={styles.languageGrid}>
          {ONBOARDING_LANGUAGES.map(item => {
            const selected = languages.includes(item.name);
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => selectLanguage(item.name)}
                style={[
                  styles.languageCard,
                  selected && styles.selectedLanguage,
                ]}
              >
                <Text
                  style={[
                    styles.nativeLanguage,
                    selected && styles.selectedLanguageText,
                  ]}
                >
                  {item.nativeName}
                </Text>
                <Text
                  style={[
                    styles.languageName,
                    selected && styles.selectedLanguageText,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {role === 'expert' && (
          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="microphone-outline"
              size={24}
              color={Colors.secondary}
            />
            <Text style={styles.infoText}>
              Hosts submit one short recording for voice verification. Review
              usually completes within 30 minutes. Host access is enabled after
              approval.
            </Text>
          </View>
        )}

        <GradientButton
          title="Continue"
          onPress={() =>
            navigation.navigate('Gender', {
              user: route.params?.user,
              existingProfile: route.params?.existingProfile,
              role,
              language: languages[0],
              languages,
              pendingCall: route.params?.pendingCall,
            })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default OnboardingPreferencesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  step: {
    marginTop: 12,
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 8,
    fontSize: 31,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 8,
    color: Colors.subText,
    fontSize: 15,
    lineHeight: 21,
  },
  heading: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  languageHelp: {
    marginTop: -6,
    marginBottom: 12,
    color: Colors.subText,
    fontSize: 13,
    lineHeight: 19,
  },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleCard: {
    flex: 1,
    minHeight: 132,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  roleTitle: {
    marginTop: 12,
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  roleDetail: { marginTop: 4, color: Colors.subText, fontSize: 13 },
  whiteMuted: { color: Colors.overlayWhite90 },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  languageCard: {
    width: '31%',
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  selectedLanguage: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.screenTint,
  },
  nativeLanguage: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  languageName: { marginTop: 3, color: Colors.subText, fontSize: 11 },
  selectedLanguageText: { color: Colors.secondary },
  infoCard: {
    marginVertical: 24,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.screenTint,
    flexDirection: 'row',
    gap: 10,
  },
  infoText: { flex: 1, color: Colors.text, fontSize: 13, lineHeight: 19 },
});
