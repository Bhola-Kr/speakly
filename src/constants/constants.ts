export interface Avatar {
  id: number;
  image: any;
}

export const SUPPORT_EMAIL = 'support@joinspeakly.com';

export const faqs = [
  {
    id: 1,
    question: 'Baat karne ki bhasha kaise badlun?',
    answer: 'Profile > Language par jaakar baat karne ki bhasha chuno.',
  },
  {
    id: 2,
    question: 'Paise kat gaye par coins nahi aaye.',
    answer:
      'Kuch minutes intezaar karo. Coins phir bhi na aayein toh Len-Den kholo, payment chuno aur uski details ke saath support se baat karo.',
  },
  {
    id: 3,
    question: 'Coins kaise add karun?',
    answer:
      'Mere Coins kholo aur coin pack chuno. Available payment method se payment poori karo.',
  },
  {
    id: 4,
    question: 'Apni profile kaise badlun?',
    answer: 'Profile > Edit Profile par jaakar apni details aur avatar badlo.',
  },
  {
    id: 5,
    question: 'Coins kharidne par refund mil sakta hai?',
    answer:
      'Coins successfully credit hone ke baad aam taur par refund nahi milta. Payment mein dikkat ho toh support se baat karo.',
  },
  {
    id: 6,
    question: 'Pichhli calls kaise dekhun?',
    answer: 'Pichhli Calls kholo aur apni calls ki details dekho.',
  },
  {
    id: 7,
    question: 'Apna account kaise delete karun?',
    answer:
      'Profile > Delete Account par jao. Aapki request record hogi aur 15 din ke andar review ki jayegi. Data turant delete nahi hota. Review ke dauraan support se baat kar sakte ho.',
  },
  {
    id: 8,
    question: 'Kya meri personal jaankari safe hai?',
    answer:
      'Haan. Aapki personal jaankari aur transactions ko safe rakhne ke liye hum industry-standard security ka istemaal karte hain.',
  },
  {
    id: 9,
    question: 'Main call kyun nahi kar paa raha hoon?',
    answer:
      'Internet, mic permission aur coin balance check karo. Expert calls ka charge call se pehle dikhaye rate par per minute lagta hai. Dikkat bani rahe toh support se baat karo.',
  },
  {
    id: 10,
    question: 'Customer support se kaise baat karun?',
    answer: `Madad ke liye kabhi bhi humein email karo: ${SUPPORT_EMAIL} par. App mein Humse Baat Karo section kholo.`,
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
