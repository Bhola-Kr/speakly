import { NativeModules } from 'react-native';

const { VoiceDetector } = NativeModules;

export interface VoiceResult {
  gender: 'male' | 'female' | 'unknown';
  pitch: number;
  confidence: number;
  samples: number;
}

export default {
  detectGender(): Promise<VoiceResult> {
    return VoiceDetector.detectGender();
  },
};
