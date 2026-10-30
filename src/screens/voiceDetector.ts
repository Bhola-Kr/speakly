import { NativeModules } from 'react-native';

const { VoiceDetector } = NativeModules;

export interface VoiceResult {
  gender: 'male' | 'female' | 'unknown';
  pitch: number;
  confidence: number;
  samples: number;
  localUri?: string;
  durationMs?: number;
}

export default {
  /**
   * Starts microphone recording.
   */
  startRecording(): Promise<boolean> {
    return VoiceDetector.startRecording();
  },

  /**
   * Stops recording and verifies the recorded voice.
   */
  stopAndVerify(): Promise<VoiceResult> {
    return VoiceDetector.stopAndVerify();
  },
};
