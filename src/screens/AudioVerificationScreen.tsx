import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

import Colors from '../constants/colors';
import VoiceDetector, { VoiceResult } from './voiceDetector';
import { databaseRef } from '../firebase/firebase';

const REVIEW_WINDOW_MS = 30 * 60 * 1000;
const MIN_RECORDING_SECONDS = 5;
const MAX_RECORDING_SECONDS = 10;
const PROMPTS: Record<string, string> = {
  English:
    'Hello, I am joining Speakly as a language expert. I will help learners speak clearly and confidently.',
  Hindi:
    'नमस्ते, मैं स्पीकली पर भाषा विशेषज्ञ के रूप में जुड़ रहा हूँ। मैं सीखने वालों को आत्मविश्वास से बोलने में मदद करूँगा।',
  Tamil:
    'வணக்கம், நான் ஸ்பீக்லியில் மொழி நிபுணராக இணைகிறேன். பயனர்கள் நம்பிக்கையுடன் பேச நான் உதவுவேன்.',
  Telugu:
    'నమస్కారం, నేను స్పీక్లీలో భాషా నిపుణుడిగా చేరుతున్నాను. నేర్చుకునేవారు ధైర్యంగా మాట్లాడేందుకు సహాయం చేస్తాను.',
  Kannada:
    'ನಮಸ್ಕಾರ, ನಾನು ಸ್ಪೀಕ್ಲಿಯಲ್ಲಿ ಭಾಷಾ ತಜ್ಞನಾಗಿ ಸೇರುತ್ತಿದ್ದೇನೆ. ಕಲಿಯುವವರು ಆತ್ಮವಿಶ್ವಾಸದಿಂದ ಮಾತನಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
  Malayalam:
    'നമസ്കാരം, ഞാൻ സ്പീക്ലിയിൽ ഭാഷാ വിദഗ്ധനായി ചേരുന്നു. പഠിക്കുന്നവർ ആത്മവിശ്വാസത്തോടെ സംസാരിക്കാൻ ഞാൻ സഹായിക്കും.',
  Bangla:
    'নমস্কার, আমি স্পিকলিতে ভাষা বিশেষজ্ঞ হিসেবে যোগ দিচ্ছি। শিক্ষার্থীদের আত্মবিশ্বাসের সঙ্গে কথা বলতে সাহায্য করব।',
};

type ApplicationStatus = 'idle' | 'recording' | 'uploading' | 'pending';

const AudioVerificationScreen = ({ navigation, route }: any) => {
  const language = String(route.params?.language || 'English');
  const prompt = PROMPTS[language] || PROMPTS.English;
  const [status, setStatus] = useState<ApplicationStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [submittedAt, setSubmittedAt] = useState(0);
  const [reviewDueAt, setReviewDueAt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef(0);
  const isStoppingRef = useRef(false);
  const stopAndSubmitRecordingRef = useRef<() => Promise<void>>(async () => {});

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
    if (!reviewDueAt) return 'Your application is waiting for admin review.';
    const due = new Date(reviewDueAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Expected review by ${due}. You can continue using Speakly as a learner while you wait.`;
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
      prompt,
      audioUrl,
      storagePath,
      durationMs: Number(result.durationMs || 0),
      submittedAt: now,
      reviewDueAt: dueAt,
      updatedAt: now,
    };
    await databaseRef().update({
      [`expertApplications/${currentUser.uid}`]: application,
      [`users/${currentUser.uid}/expertApplication`]: application,
      [`users/${currentUser.uid}/isExpert`]: false,
      [`users/${currentUser.uid}/verification/voiceVerified`]: false,
    });
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
        <View style={styles.pendingContent}>
          <View style={styles.pendingIcon}>
            <MaterialCommunityIcons
              name="clock-check-outline"
              size={46}
              color={Colors.secondary}
            />
          </View>
          <Text style={styles.title}>Application submitted</Text>
          <Text style={styles.subtitle}>{reviewMessage}</Text>
          <Text style={styles.submittedText}>
            Submitted {new Date(submittedAt).toLocaleString('en-IN')}
          </Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
            }
          >
            <Text style={styles.secondaryButtonText}>Continue as learner</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>EXPERT VERIFICATION</Text>
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
                ]}
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
  timer: {
    marginTop: 18,
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  recordHint: { marginTop: 12, color: Colors.subText, fontSize: 14 },
  pendingContent: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.screenTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  submittedText: { marginTop: 18, color: Colors.subText, fontSize: 12 },
  secondaryButton: {
    marginTop: 30,
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
