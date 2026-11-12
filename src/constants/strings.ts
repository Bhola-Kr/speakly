import { CALL_RATE_PER_MINUTE } from './constants';

export const copy = {
  brand: {
    appName: 'Speakly 121',
    splash: 'Speakly 121',
    tagline: 'Baat Ho Jaaye?',
    valueProposition: 'Live one-to-one conversations.',
    offer: 'First 2 minutes free · Then from ₹4/min · No subscription',
  },
  login: {
    heading: 'Baat Ho Jaaye?',
    subtitle:
      'Live one-to-one conversations. First 2 minutes free, then from ₹4/min. No subscription.',
    heroTitle: 'Live one-to-one conversations',
    supportingText:
      'Choose an available host. First 2 minutes free, then from ₹4/min.',
    cta: 'Continue',
    phonePlaceholder: 'Your Mobile Number',
    safetyNote:
      'Social audio conversations only. Speakly 121 is not a dating, therapy, or professional advice service.',
  },
  home: {
    heading: 'Who Would You Like to Talk To?',
    supportingText: 'Live one-to-one conversations.',
    offer: 'First 2 minutes free · Then from ₹4/min · No subscription',
    sectionHint: 'Choose an available host.',
    availableHosts: 'Available Hosts',
    online: 'Online',
    busy: 'Busy',
    offline: 'Offline',
    startCall: 'Start Call',
    randomMatch: 'Find Someone to Talk To',
    talkAgain: 'Talk Again',
    noHosts: 'No hosts are available right now',
    noHostsHint: 'Try another topic or check back in a little while.',
  },
  recents: {
    title: 'Recents',
    supportingText: 'View your completed and missed voice calls.',
    emptyTitle: 'No Calls Yet',
    emptyText: 'Your conversations will appear here.',
  },
  wallet: {
    title: 'My Coins',
    addCoins: 'Add Coins',
    balanceLabel: 'My Coins',
    lowBalanceTitle: 'Not Enough Coins',
    lowBalanceMessage:
      'Calls start from ₹4/min. Add coins to continue your conversation.',
    starterTitle: 'Keep the conversation going',
    starterMessage: 'Add ₹20 for about 4–5 more minutes.',
    starterAction: 'Add ₹20',
  },
  call: {
    outgoing: 'Calling...',
    connecting: 'Connecting...',
    connected: 'Connected',
    reconnecting: 'Reconnecting...',
    rejected: 'Call Declined',
    rejectedMessage: 'The host declined this call.',
    timeout: 'No Answer',
    failedAction: 'Try Another Host',
    ended: 'Call Ended',
    callAgain: 'Call Again',
    incoming: 'Incoming Call',
  },
  host: {
    onboarding: 'Become a Host',
    verification: 'Voice Verification',
    pending: 'Application Under Review',
    approved: "You're Approved!",
    dashboard: 'Host Dashboard',
    goOnline: 'Go Online',
    goOffline: 'Go Offline',
    earnings: 'My Earnings',
    roleName: 'Host',
  },
  common: {
    continue: 'Continue',
    cancel: 'Cancel',
    accept: 'Accept',
    decline: 'Decline',
    tryAgain: 'Please try again.',
  },
  postCall: {
    title: 'Want to keep talking?',
    message: 'Add ₹20 for about 4–5 more minutes.',
    action: 'Add ₹20 & Talk Again',
    later: 'Maybe later',
  },
} as const;

export default {
  appName: copy.brand.appName,
  heading: copy.home.heading,
  subHeading: `Live conversations from ₹${CALL_RATE_PER_MINUTE}/min`,
  phonePlaceholder: copy.login.phonePlaceholder,
  otp: copy.login.cta,
};
