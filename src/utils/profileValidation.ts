export const MIN_USERNAME_LENGTH = 3;

export const hasValidUsername = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length >= MIN_USERNAME_LENGTH;

type AccountData = {
  profile?: {
    gender?: unknown;
    name?: unknown;
  };
  verification?: {
    voiceVerified?: unknown;
  };
};

export const hasCompletedSignup = (user: AccountData | null): boolean => {
  const gender = user?.profile?.gender;

  if (!hasValidUsername(user?.profile?.name)) return false;
  if (gender === 'male') return true;

  return gender === 'female' && user?.verification?.voiceVerified === true;
};
