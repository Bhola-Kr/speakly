export const MIN_USERNAME_LENGTH = 3;

const NAME_CHARACTERS = /^[\p{L}\p{M} .'-]+$/u;

export const hasValidName = (value: unknown, minimumLength: number): boolean =>
  typeof value === 'string' &&
  value.trim().length >= minimumLength &&
  NAME_CHARACTERS.test(value.trim());

export const hasValidUsername = (value: unknown): boolean =>
  hasValidName(value, MIN_USERNAME_LENGTH);

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
