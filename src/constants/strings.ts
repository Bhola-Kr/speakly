import { CALL_RATE_PER_MINUTE } from './constants';

export const copy = {
  brand: {
    appName: 'Speakly 121',
    splash: 'Speakly 121',
    tagline: 'Baat Ho Jaaye?',
    valueProposition: 'Live one-to-one conversations.',
    offer: 'Claim ₹10 free · Talk for 2 minutes · No subscription',
  },
  login: {
    heading: 'Baat Ho Jaaye?',
    subtitle:
      'Claim ₹10 free call balance—enough for your first 2 minutes. No subscription.',
    heroTitle: 'Live one-to-one conversations',
    supportingText:
      'Choose an available host. ₹10 free balance covers your first 2 minutes.',
    cta: 'Continue',
    phonePlaceholder: 'Your Mobile Number',
    safetyNote:
      'Social audio conversations only. Speakly 121 is not a dating, therapy, or professional advice service.',
  },
  home: {
    heading: 'Who Would You Like to Talk To?',
    supportingText: 'Live one-to-one conversations.',
    offer: 'Claim ₹10 free · Your first 2 minutes are covered',
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
    title: 'My Balance',
    addCoins: 'Recharge',
    balanceLabel: 'Speakly Balance',
    lowBalanceTitle: 'Not Enough Balance',
    lowBalanceMessage:
      'Host rates are shown before calling. Recharge to continue your conversation.',
    starterTitle: 'Keep the conversation going',
    starterMessage: 'Recharge ₹10 and continue talking.',
    starterAction: 'Recharge ₹10',
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
    message: 'Recharge ₹10 and continue talking.',
    action: 'Recharge ₹10',
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
