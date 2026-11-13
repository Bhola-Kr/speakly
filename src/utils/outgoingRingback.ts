import InCallManager from 'react-native-incall-manager';

let ringbackActive = false;

export const startOutgoingRingback = () => {
  if (ringbackActive) return;
  ringbackActive = true;
  InCallManager.startRingback('_DTMF_');
};

export const stopOutgoingRingback = () => {
  ringbackActive = false;
  // Always ask native to stop as this also clears a tone that survived a
  // JavaScript refresh while an outgoing call was in progress.
  InCallManager.stopRingback();
};
