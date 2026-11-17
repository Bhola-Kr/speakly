import { CALL_RATE_PER_MINUTE } from './constants';

export const callStatusText = (value: string) =>
  ((
    {
      Completed: 'Call Ho Gayi',
      Missed: 'Call Miss Hui',
      Failed: 'Call Nahi Judi',
      calling: 'Call Ja Rahi Hai',
      ringing: 'Phone Baj Raha Hai',
      accepted: 'Call Utha Li',
      active: 'Baat Chal Rahi Hai',
      ended: 'Call Khatam Hui',
      waiting: 'Available',
      offline: 'Offline',
      rejected: 'Call Reject Hui',
      men_rejected: 'Call Cancel Hui',
    } as Record<string, string>
  )[value] || 'Status Available Nahi Hai');

export const topicLabel = (value: string) =>
  ((
    {
      All: 'Sab',
      'Everyday Conversations': 'Roz Ki Baatein',
      'Work & Career': 'Kaam Aur Career',
      'Travel & Culture': 'Safar Aur Culture',
      'Stories & Experiences': 'Kisse Aur Anubhav',
      'Hobbies & Interests': 'Shauk Aur Pasand',
      'Open Conversation': 'Dil Khol Ke Baat',
    } as Record<string, string>
  )[value] || value);

export const copy = {
  brand: {
    appName: 'Speakly 121',
    splash: 'Speakly 121',
    tagline: 'Baat Ho Jaaye?',
    valueProposition: 'Apni pasand ke expert se baat karo.',
    offer: 'Live baat karo · Subscription ki zaroorat nahi',
  },
  login: {
    heading: 'Baat Ho Jaaye?',
    subtitle:
      'Sign in karo aur available expert chuno. Subscription ki zaroorat nahi.',
    heroTitle: 'Expert se Connect Karo',
    supportingText: 'Available expert chuno aur dil khol ke baat karo.',
    cta: 'Aage Badho',
    phonePlaceholder: 'Apna Mobile Number',
    safetyNote:
      'Sirf social baatcheet ke liye. Speakly 121 dating, therapy ya professional salah ki service nahi hai.',
  },
  home: {
    heading: 'Kis Se Baat Karna Chahoge?',
    supportingText: 'Expert se Connect Karo',
    offer: 'Expert chuno aur baat shuru karo',
    sectionHint: 'Available expert chuno.',
    availableHosts: 'Available Experts',
    online: 'Online',
    busy: 'Busy',
    offline: 'Offline',
    startCall: 'Connect Now',
    randomMatch: 'Start Communication',
    talkAgain: 'Phir Baat Karo',
    noHosts: 'Abhi koi expert available nahi hai',
    noHostsHint: 'Dusra topic chuno ya thodi der baad try karo.',
  },
  recents: {
    title: 'Pichhli Calls',
    supportingText: 'Apni completed aur missed calls dekho.',
    emptyTitle: 'Abhi Koi Call Nahi Hui',
    emptyText: 'Aapki calls yahan dikhegi.',
  },
  wallet: {
    title: 'Mera Balance',
    addCoins: 'Recharge',
    balanceLabel: 'Speakly Balance',
    lowBalanceTitle: 'Balance Kam Hai',
    lowBalanceMessage:
      'Call se pehle expert ka rate dekho. Baat karne ke liye recharge karo.',
    starterTitle: 'Baat Jaari Rakho',
    starterMessage: '₹10 recharge karo aur baat jaari rakho.',
    starterAction: 'Recharge ₹10',
  },
  call: {
    outgoing: 'Call Ja Rahi Hai…',
    connecting: 'Call connect ho rahi hai…',
    connected: 'Connected',
    reconnecting: 'Phir connect ho raha hai…',
    rejected: 'Call Accept Nahi Hui',
    rejectedMessage: 'Expert ne call accept nahi ki.',
    timeout: 'Jawab Nahi Aaya',
    failedAction: 'Dusra Expert Chuno',
    ended: 'Call Khatam Hui',
    callAgain: 'Phir Connect Karo',
    incoming: 'Nayi Call Aa Rahi Hai',
  },
  host: {
    onboarding: 'Expert Bano',
    verification: 'Voice Verification',
    pending: 'Application Check Ho Rahi Hai',
    approved: 'Aap Approve Ho Gaye!',
    dashboard: 'Expert Dashboard',
    goOnline: 'Online Aao',
    goOffline: 'Offline Jao',
    earnings: 'Meri Kamai',
    roleName: 'Expert',
  },
  common: {
    continue: 'Aage Badho',
    cancel: 'Cancel',
    accept: 'Accept',
    decline: 'Decline',
    tryAgain: 'Dobara try karo.',
  },
  postCall: {
    title: 'Aur Baat Karni Hai?',
    message: '₹10 recharge karo aur baat jaari rakho.',
    action: 'Recharge ₹10',
    later: 'Baad Mein',
  },
} as const;

export default {
  appName: copy.brand.appName,
  heading: copy.home.heading,
  subHeading: `Baat Shuru Karo ₹${CALL_RATE_PER_MINUTE}/min`,
  phonePlaceholder: copy.login.phonePlaceholder,
  otp: copy.login.cta,
};

// App copy is translated at display time; notification producers retain Hinglish.
export {
  translate,
  getAppLanguage,
  setAppLanguage,
} from '../localization/language';
