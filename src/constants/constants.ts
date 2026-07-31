export interface Avatar {
  id: number;
  image: any;
}

export const faqs = [
  {
    id: 1,
    question: 'How do I change my language?',
    answer:
      'Go to Profile > Language and choose your preferred language. The app will automatically update.',
  },
  {
    id: 2,
    question: 'Money was deducted but not added to my wallet.',
    answer:
      'Please wait for a few minutes. If your wallet is still not credited, open Transactions, select the payment, and contact support with the transaction details.',
  },
  {
    id: 3,
    question: 'How do I add money to my wallet?',
    answer:
      'Open the Wallet section and tap "Add Balance". Choose an amount and complete the payment using UPI, Card, or other available payment methods.',
  },
  {
    id: 4,
    question: 'How do I update my profile?',
    answer:
      'Go to Profile > Edit Profile to update your nickname, avatar, and other profile information.',
  },
  {
    id: 5,
    question: 'Can I get a refund for wallet recharge?',
    answer:
      'Wallet recharges are generally non-refundable after they are successfully credited. If you experience a payment issue, please contact support.',
  },
  {
    id: 6,
    question: 'How do I view my call history?',
    answer:
      'Open the Recent Calls section from your profile to view your previous conversations.',
  },
  {
    id: 7,
    question: 'How do I delete my account?',
    answer:
      'Go to Profile > Delete Account. You will be asked to confirm your request before contacting our support team for permanent account deletion.',
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
      'Please check your internet connection, microphone permission, and wallet balance. If the issue continues, contact support.',
  },
  {
    id: 10,
    question: 'How can I contact customer support?',
    answer:
      'You can contact us anytime by emailing tamizhkuralhelp@gmail.com from the Contact Us section in the app.',
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

export const getUserAvatar = (user: any) => {
  try {
    if (user?.profile?.gender === 'female') {
      const avatar = femaleAvatars.find(
        item => item.id === Number(user?.profile?.avatarId),
      );

      return avatar?.image ?? femaleAvatars[0].image;
    }

    return require('../assets/man.png');
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
