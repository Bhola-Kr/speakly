export const MIN_USERNAME_LENGTH = 3;

const NAME_CHARACTERS = /^[\p{L}\p{M} .'-]+$/u;

export const hasValidName = (value: unknown, minimumLength: number): boolean =>
  typeof value === 'string' &&
  value.trim().length >= minimumLength &&
  NAME_CHARACTERS.test(value.trim());

export const hasValidUsername = (value: unknown): boolean =>
  hasValidName(value, MIN_USERNAME_LENGTH);

export const createAnonymousName = (uid: string): string => {
  let hash = 0;
  for (let index = 0; index < uid.length; index += 1) {
    hash = (hash * 31 + uid.charCodeAt(index)) % 10000;
  }
  return `Anonymous ${String(hash).padStart(4, '0')}`;
};

export const createAnonymousNameFromPhone = (phone: string): string => {
  const lastFourDigits = String(phone || '')
    .replace(/\D/g, '')
    .slice(-4);
  return `Anonymous ${lastFourDigits.padStart(4, '0')}`;
};

export const isAnonymousProfileName = (value: unknown): boolean => {
  const name = String(value || '').trim();
  return name === 'User' || /^Anonymous \d{4}$/.test(name);
};

type AccountData = {
  profile?: {
    gender?: unknown;
    name?: unknown;
    avatarSelected?: unknown;
  };
};

export const hasCompletedSignup = (user: AccountData | null): boolean => {
  const gender = user?.profile?.gender;

  return (
    (gender === 'male' || gender === 'female') &&
    hasValidUsername(user?.profile?.name) &&
    user?.profile?.avatarSelected === true
  );
};
