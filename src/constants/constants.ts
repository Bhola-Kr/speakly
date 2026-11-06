export interface Avatar {
  id: number;
  image: any;
}

export const SUPPORT_EMAIL = 'support@joinspeakly.com';

export const faqs = [
  {
    id: 1,
    question: 'How do I change my preferred conversation language?',
    answer:
      'Go to Profile > Language and choose the language you prefer for conversations.',
  },
  {
    id: 2,
    question: 'Money was deducted but coins were not added.',
    answer:
      'Please wait for a few minutes. If your coins are still not credited, open Transactions, select the payment, and contact support with the transaction details.',
  },
  {
    id: 3,
    question: 'How do I add coins?',
    answer:
      'Open My Coins and choose a coin pack. Complete the payment using any available payment method.',
  },
  {
    id: 4,
    question: 'How do I update my profile?',
    answer:
      'Go to Profile > Edit Profile to update your available profile information and avatar.',
  },
  {
    id: 5,
    question: 'Can I get a refund for a coin purchase?',
    answer:
      'Coin purchases are generally non-refundable after they are successfully credited. If you experience a payment issue, please contact support.',
  },
  {
    id: 6,
    question: 'How do I view my call history?',
    answer:
      'Open Recents to view your previous conversations and call details.',
  },
  {
    id: 7,
    question: 'How do I delete my account?',
    answer:
      'Go to Profile > Delete Account. Your request will be recorded and reviewed within 15 days. Your data is not deleted immediately, and you can contact support during the review period.',
  },
  {
    id: 8,
    question: 'Is my personal information secure?',
    answer:
      'Yes. We use industry-standard security practices to protect your personal information and transactions.',
  },
  {
    id: 9,
    question: 'Why am I unable to make a call?',
    answer:
      'Please check your internet connection, microphone permission, and coin balance. Host calls are charged per minute at the price shown before you call. If the issue continues, contact support.',
  },
  {
    id: 10,
    question: 'How can I contact customer support?',
    answer: `You can contact us anytime by emailing ${SUPPORT_EMAIL} from the Contact Us section in the app.`,
  },
];

export const femaleAvatars: Avatar[] = [
  { id: 1, image: require('../assets/avatars/avatar1.png') },
  { id: 2, image: require('../assets/avatars/avatar2.png') },
  { id: 3, image: require('../assets/avatars/avatar3.png') },
  { id: 4, image: require('../assets/avatars/avatar4.png') },
  { id: 5, image: require('../assets/avatars/avatar5.png') },
  { id: 6, image: require('../assets/avatars/avatar6.png') },
  { id: 7, image: require('../assets/avatars/avatar7.png') },
  { id: 8, image: require('../assets/avatars/avatar8.png') },
  { id: 9, image: require('../assets/avatars/avatar9.png') },
  { id: 10, image: require('../assets/avatars/avatar10.png') },
  { id: 11, image: require('../assets/avatars/avatar11.png') },
  { id: 12, image: require('../assets/avatars/avatar12.png') },
  { id: 13, image: require('../assets/avatars/avatar13.png') },
  { id: 14, image: require('../assets/avatars/avatar14.png') },
  { id: 15, image: require('../assets/avatars/avatar15.png') },
  { id: 16, image: require('../assets/avatars/avatar16.png') },
  { id: 17, image: require('../assets/avatars/avatar17.png') },
  { id: 18, image: require('../assets/avatars/avatar18.png') },
  { id: 19, image: require('../assets/avatars/avatar19.png') },
  { id: 20, image: require('../assets/avatars/avatar20.png') },
];

export const maleAvatars: Avatar[] = [
  { id: 1, image: require('../assets/manAvatars/avatar1.jpeg') },
  { id: 2, image: require('../assets/manAvatars/avatar2.jpeg') },
  { id: 3, image: require('../assets/manAvatars/avatar3.jpeg') },
  { id: 4, image: require('../assets/manAvatars/avatar4.jpeg') },
  { id: 5, image: require('../assets/manAvatars/avatar5.jpeg') },
  { id: 6, image: require('../assets/manAvatars/avatar6.jpeg') },
  { id: 7, image: require('../assets/manAvatars/avatar7.jpeg') },
  { id: 8, image: require('../assets/manAvatars/avatar8.jpeg') },
  { id: 9, image: require('../assets/manAvatars/avatar9.jpeg') },
  { id: 10, image: require('../assets/manAvatars/avatar10.jpeg') },
  { id: 11, image: require('../assets/manAvatars/avatar11.jpeg') },
  { id: 12, image: require('../assets/manAvatars/avatar12.jpeg') },
  { id: 13, image: require('../assets/manAvatars/avatar13.jpeg') },
  { id: 14, image: require('../assets/manAvatars/avatar14.jpeg') },
  { id: 15, image: require('../assets/manAvatars/avatar15.jpeg') },
  { id: 16, image: require('../assets/manAvatars/avatar16.jpeg') },
];

export const getFemaleAvatar = (avatarId: number | string | undefined) => {
  return (
    femaleAvatars.find(avatar => avatar.id === Number(avatarId))?.image ??
    femaleAvatars[0].image
  );
};

export const getMaleAvatar = (avatarId: number | string | undefined) => {
  return (
    maleAvatars.find(avatar => avatar.id === Number(avatarId))?.image ??
    maleAvatars[0].image
  );
};

export const getUserAvatar = (user: any) => {
  try {
    if (String(user?.profile?.gender).toLowerCase() === 'female') {
      return getFemaleAvatar(user?.profile?.avatarId);
    }

    return getMaleAvatar(user?.profile?.avatarId);
  } catch {
    return require('../assets/man.png');
  }
};

export const formatDate = (timestamp: number | string) => {
  return new Date(Number(timestamp)).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const transliterateToTamil = async (text: string) => {
  const response = await fetch(
    `https://inputtools.google.com/request?itc=ta-t-i0-und&text=${encodeURIComponent(
      text,
    )}`,
  );

  const result = await response.json();

  if (result[0] === 'SUCCESS') {
    return result[1][0][1][0];
  }

  return text;
};

export const calculateAge = (birthYear: number | string): string => {
  if (!birthYear) return '';

  const year = Number(birthYear);

  if (isNaN(year)) return '';

  const currentYear = new Date().getFullYear();

  const age = currentYear - year;

  return age >= 0 ? age.toString() : '';
};

export const CALL_RATE_PER_MINUTE = 5;

export const normalizeCallRate = (value: unknown): number => {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : CALL_RATE_PER_MINUTE;
};

/**
 * Calculates call amount using the host's snapshotted per-minute rate.
 * With the ₹5 default: up to 1 minute = ₹5, and 1 min 1 sec = ₹10.
 */
export const calculateCallAmount = (
  callStartedAt: number,
  callEndedAt: number = Date.now(),
  ratePerMinute: number = CALL_RATE_PER_MINUTE,
): number => {
  const durationMs = Math.max(0, callEndedAt - callStartedAt);

  const durationMinutes = Math.ceil(durationMs / (60 * 1000));

  // Minimum charge is 1 minute
  return Math.max(1, durationMinutes) * normalizeCallRate(ratePerMinute);
};
