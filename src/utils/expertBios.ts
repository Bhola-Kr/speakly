const DEFAULT_BIOS = [
  'Dil kholkar baatein karo, apne din ke khaas moments mere saath share karo. 😊',
  'Chhoti-chhoti khushiyon se lekar badi achievements tak, har baat share karo. ✨',
  'Aaj ka din kaisa raha? Aao baatein karein aur kuch achhe moments banayein. 💬',
  'Fun conversations aur positive vibes ke saath apne din ko aur special banao. 🌸',
  'Apni stories, naye ideas aur interesting experiences mere saath share karo. 🌟',
  'Har conversation ko interesting banate hain. Aao connect karo aur khulkar baat karo. 😊',
  'Confidence ke saath baat karna chahte ho? Aao, ek achhi conversation shuru karein. 🎧',
  'Daily life, goals aur achievements par friendly conversations ke liye connect karo. 💫',
  'Achhi baatein, naye thoughts aur happy moments — sab share kar sakte ho. 🎉',
  'Aapki baatein sunne aur interesting topics par connect karne ke liye ready hoon. ❤️',
];

const expertIdHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 4294967296;
  }
  return hash;
};

const customBio = (profile: any) => {
  for (const value of [
    profile?.bio,
    profile?.about,
    profile?.description,
    profile?.intro,
    profile?.tagline,
  ]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

/**
 * Return a stable display-only bio for each expert. Custom profile copy always
 * wins. Sorting IDs before resolving hash collisions keeps the assignment
 * stable across refreshes and unique for up to ten default bios in the list.
 */
export function buildExpertBioMap(experts: any[]) {
  const result = new Map<string, string>();
  const defaults = experts
    .map(expert => ({
      uid: String(expert?.uid || ''),
      bio: customBio(expert?.profile),
    }))
    .filter(expert => expert.uid)
    .sort((first, second) => first.uid.localeCompare(second.uid));

  for (const expert of defaults) {
    if (expert.bio) result.set(expert.uid, expert.bio);
  }

  const assigned = new Set<number>();
  for (const expert of defaults) {
    if (expert.bio) continue;
    const start = expertIdHash(expert.uid) % DEFAULT_BIOS.length;
    let index = start;
    while (assigned.has(index) && assigned.size < DEFAULT_BIOS.length) {
      index = (index + 1) % DEFAULT_BIOS.length;
    }
    result.set(expert.uid, DEFAULT_BIOS[index]);
    assigned.add(index);
  }
  return result;
}
