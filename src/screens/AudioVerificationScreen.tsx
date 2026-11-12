import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

import Colors from '../constants/colors';
import VoiceDetector, { VoiceResult } from './voiceDetector';
import { databaseRef } from '../firebase/firebase';
import { notifyAdminsOfExpertApplication } from '../api/calls';
import { copy } from '../constants/strings';

const REVIEW_WINDOW_MS = 30 * 60 * 1000;
const MIN_RECORDING_SECONDS = 5;
const MAX_RECORDING_SECONDS = 10;
const HOST_VERIFICATION_PROMPT =
  'Hello, I am joining Speakly 121 as a conversation host. I will welcome callers with respect and keep every conversation safe and genuine.';
const PROMPTS: Record<string, string> = {
  English: HOST_VERIFICATION_PROMPT,
  Hindi: HOST_VERIFICATION_PROMPT,
  Sanskrit: HOST_VERIFICATION_PROMPT,
  Tamil: HOST_VERIFICATION_PROMPT,
  Telugu: HOST_VERIFICATION_PROMPT,
  Kannada: HOST_VERIFICATION_PROMPT,
  Malayalam: HOST_VERIFICATION_PROMPT,
  Bangla: HOST_VERIFICATION_PROMPT,
};

type ApplicationStatus = 'idle' | 'recording' | 'uploading' | 'pending';

const AudioVerificationScreen = ({ navigation, route }: any) => {
  const language = String(route.params?.language || 'English');
  const supportedLanguages: string[] = Array.isArray(route.params?.languages)
    ? route.params.languages
        .map((item: unknown) => String(item))
        .filter(Boolean)
    : [language];
  const prompt = PROMPTS[language] || PROMPTS.English;
  const [status, setStatus] = useState<ApplicationStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [submittedAt, setSubmittedAt] = useState(0);
  const [reviewDueAt, setReviewDueAt] = useState(0);
  const [contactConsent, setContactConsent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef(0);
  const isStoppingRef = useRef(false);
  const stopAndSubmitRecordingRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    const ref = databaseRef(`users/${currentUser.uid}/expertApplication`);
    const listener = ref.on('value', snapshot => {
      const application = snapshot.val();
      if (application?.status === 'pending') {
        setSubmittedAt(Number(application.submittedAt || 0));
        setReviewDueAt(Number(application.reviewDueAt || 0));
        setStatus('pending');
      } else if (application?.status === 'approved') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'FemaleBottomTabs' }],
        });
      } else if (application?.status === 'rejected') {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      }
    });
    return () => ref.off('value', listener);
  }, [navigation]);

  const reviewMessage = useMemo(() => {
    if (!reviewDueAt) return 'Your host application is waiting for review.';
    const due = new Date(reviewDueAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Expected review by ${due}. You will receive host access after your application is approved.`;
  }, [reviewDueAt]);

  const requestPermission = async () => {
    if (Platform.OS !== 'android') return true;
    return (
      (await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      )) === PermissionsAndroid.RESULTS.GRANTED
    );
  };

  const submitRecording = async (result: VoiceResult) => {
    const currentUser = auth().currentUser;
    if (!currentUser) throw new Error('Please sign in again.');
    if (!contactConsent) {
      throw new Error('Please provide onboarding contact consent.');
    }
    if (!result.localUri)
      throw new Error('The recording file was not created.');
    if (Number(result.durationMs || 0) < MIN_RECORDING_SECONDS * 1000) {
      throw new Error(
        `Please record for at least ${MIN_RECORDING_SECONDS} seconds.`,
      );
    }

    setStatus('uploading');
    const now = Date.now();
    const dueAt = now + REVIEW_WINDOW_MS;
    const storagePath = `expert-verifications/${currentUser.uid}/${now}.wav`;
    const reference = storage().ref(storagePath);
    await reference.putFile(result.localUri, {
      contentType: 'audio/wav',
      customMetadata: { uid: currentUser.uid, language },
    });
    const audioUrl = await reference.getDownloadURL();
    const application = {
      uid: currentUser.uid,
      status: 'pending',
      language,
      verificationLanguage: language,
      supportedLanguages,
      prompt,
      audioUrl,
      storagePath,
      durationMs: Number(result.durationMs || 0),
      onboardingContactConsent: true,
      consentedAt: now,
      submittedAt: now,
      reviewDueAt: dueAt,
      updatedAt: now,
    };
    await databaseRef().update({
      [`expertApplications/${currentUser.uid}`]: application,
      [`users/${currentUser.uid}/expertApplication`]: application,
      [`users/${currentUser.uid}/isExpert`]: false,
      [`users/${currentUser.uid}/verification/voiceVerified`]: false,
      [`users/${currentUser.uid}/profile/supportedLanguages`]:
        supportedLanguages,
    });
    await notifyAdminsOfExpertApplication().catch(error =>
      console.warn('Unable to notify administrators:', error),
    );
    setSubmittedAt(now);
    setReviewDueAt(dueAt);
    setStatus('pending');
  };

  const stopAndSubmitRecording = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const result = await VoiceDetector.stopAndVerify();
      await submitRecording(result);
    } catch (error: any) {
      setStatus('idle');
      Alert.alert(
        'Unable to submit recording',
        error?.message || 'Please try again.',
      );
    } finally {
      isStoppingRef.current = false;
    }
  };
  stopAndSubmitRecordingRef.current = stopAndSubmitRecording;

  const toggleRecording = async () => {
    if (status === 'recording') {
      await stopAndSubmitRecording();
      return;
    }

    if (status !== 'idle') return;
    if (!contactConsent) {
      Alert.alert(
        'Consent Required',
        'Please confirm that the Speakly 121 team may contact you for onboarding assistance.',
      );
      return;
    }

    try {
      if (!(await requestPermission()))
        throw new Error('Microphone permission is required.');
      await VoiceDetector.startRecording();
      recordingStartedAtRef.current = Date.now();
      isStoppingRef.current = false;
      setSeconds(0);
      setStatus('recording');
    } catch (error: any) {
      setStatus('idle');
      Alert.alert(
        'Unable to start recording',
        error?.message || 'Please try again.',
      );
    }
  };

  useEffect(() => {
    if (status !== 'recording') return;

    const updateTimer = () => {
      const elapsedSeconds = Math.min(
        MAX_RECORDING_SECONDS,
        Math.floor((Date.now() - recordingStartedAtRef.current) / 1000),
      );
      setSeconds(elapsedSeconds);

      if (elapsedSeconds >= MAX_RECORDING_SECONDS) {
        stopAndSubmitRecordingRef.current().catch(() => undefined);
      }
    };

    timerRef.current = setInterval(updateTimer, 250);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  if (status === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          backgroundColor={Colors.background}
          barStyle="dark-content"
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pendingContent}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <MaterialCommunityIcons
                name="waveform"
                size={25}
                color={Colors.white}
              />
            </View>
            <Text style={styles.brandName}>Speakly 121</Text>
          </View>

          <View style={styles.reviewIllustration}>
            <View style={styles.reviewGlow} />
            <MaterialCommunityIcons
              name="clock-check-outline"
              size={76}
              color={Colors.secondary}
            />
          </View>

          <Text style={styles.pendingTitle}>{copy.host.pending}</Text>
          <Text style={styles.pendingSubtitle}>
            Your host application has been submitted successfully.
          </Text>

          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <MaterialCommunityIcons
                name="check-circle"
                size={27}
                color={Colors.successStrong}
              />
              <Text style={styles.progressText}>Voice sample submitted</Text>
            </View>
            <View style={styles.progressLineActive} />
            <View style={styles.progressRow}>
              <View style={styles.reviewingIcon}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={19}
                  color={Colors.warningStrong}
                />
              </View>
              <Text style={styles.progressText}>
                Team reviewing your profile
              </Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressRow}>
              <MaterialCommunityIcons
                name="checkbox-blank-circle-outline"
                size={27}
                color={Colors.placeholder}
              />
              <Text style={[styles.progressText, styles.progressTextPending]}>
                Host account activation
              </Text>
            </View>
          </View>

          <View style={styles.notificationCard}>
            <View style={styles.notificationIcon}>
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={31}
                color={Colors.secondary}
              />
            </View>
            <Text style={styles.notificationTitle}>
              We’ll notify you once approved!
            </Text>
            <Text style={styles.notificationText}>
              Once approved, you can go online, receive calls, and start
              earning.
            </Text>
          </View>

          <Text style={styles.reviewMessage}>{reviewMessage}</Text>
          <Text style={styles.submittedText}>
            Submitted {new Date(submittedAt).toLocaleString('en-IN')}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>
          {copy.host.verification.toUpperCase()}
        </Text>
        <Text style={styles.title}>Record in {language}</Text>
        <Text style={styles.subtitle}>
          Read the text naturally. An admin will listen and normally review it
          within 30 minutes.
        </Text>

        <View style={styles.promptCard}>
          <MaterialCommunityIcons
            name="format-quote-open"
            size={28}
            color={Colors.secondary}
          />
          <Text style={styles.prompt}>{prompt}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: contactConsent }}
          disabled={status !== 'idle'}
          onPress={() => setContactConsent(value => !value)}
          style={[
            styles.consentCard,
            contactConsent && styles.consentCardSelected,
          ]}
        >
          <MaterialCommunityIcons
            name={
              contactConsent
                ? 'checkbox-marked-circle'
                : 'checkbox-blank-circle-outline'
            }
            size={27}
            color={contactConsent ? Colors.secondary : Colors.placeholder}
          />
          <Text style={styles.consentText}>
            I choose to be contacted by the Speakly 121 team for assistance in
            onboarding. The team may contact opted-in Experts with setup
            guidance and early-host updates.
          </Text>
        </TouchableOpacity>

        <View style={styles.recordingArea}>
          {status === 'uploading' ? (
            <>
              <ActivityIndicator size="large" color={Colors.secondary} />
              <Text style={styles.recordHint}>Saving recording securely…</Text>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  status === 'recording' && styles.stopButton,
                  !contactConsent && styles.micButtonDisabled,
                ]}
                disabled={!contactConsent && status !== 'recording'}
                onPress={toggleRecording}
              >
                <MaterialCommunityIcons
                  name={status === 'recording' ? 'stop' : 'microphone'}
                  size={42}
                  color={Colors.white}
                />
              </TouchableOpacity>
              <Text style={styles.timer}>
                00:{String(seconds).padStart(2, '0')}
              </Text>
              <Text style={styles.recordHint}>
                {status === 'recording'
                  ? `Recording stops automatically at ${MAX_RECORDING_SECONDS} seconds`
                  : `Record ${MIN_RECORDING_SECONDS}–${MAX_RECORDING_SECONDS} seconds`}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AudioVerificationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: 22 },
  eyebrow: {
    marginTop: 22,
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 8,
    color: Colors.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    color: Colors.subText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  promptCard: {
    marginTop: 28,
    padding: 20,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  prompt: {
    marginTop: 8,
    color: Colors.text,
    fontSize: 19,
    lineHeight: 30,
    fontWeight: '700',
  },
  consentCard: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  consentCardSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
  },
  consentText: {
    flex: 1,
    marginLeft: 12,
    color: Colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  recordingArea: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
  },
  stopButton: { backgroundColor: Colors.danger },
  micButtonDisabled: { backgroundColor: Colors.disabled },
  timer: {
    marginTop: 18,
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  recordHint: { marginTop: 12, color: Colors.subText, fontSize: 14 },
  pendingContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  brandIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    marginLeft: 10,
    color: Colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  reviewIllustration: {
    width: 150,
    height: 150,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.surface,
  },
  pendingTitle: {
    color: Colors.text,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  pendingSubtitle: {
    maxWidth: 320,
    marginTop: 12,
    color: Colors.subText,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  progressCard: {
    width: '100%',
    marginTop: 28,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderRadius: 22,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  progressRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    marginLeft: 14,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  progressTextPending: { color: Colors.subText },
  reviewingIcon: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningStrongSurface,
  },
  progressLineActive: {
    width: 2,
    height: 17,
    marginLeft: 13,
    backgroundColor: Colors.successStrong,
  },
  progressLine: {
    width: 2,
    height: 17,
    marginLeft: 13,
    backgroundColor: Colors.border,
  },
  notificationCard: {
    width: '100%',
    marginTop: 20,
    padding: 22,
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notificationIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  notificationTitle: {
    marginTop: 14,
    color: Colors.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  notificationText: {
    maxWidth: 300,
    marginTop: 7,
    color: Colors.subText,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  reviewMessage: {
    marginTop: 18,
    color: Colors.subText,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  submittedText: { marginTop: 6, color: Colors.placeholder, fontSize: 11 },
  secondaryButton: {
    marginTop: 24,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.secondary,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '800',
  },
});
