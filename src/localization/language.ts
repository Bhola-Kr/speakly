import AsyncStorage from '@react-native-async-storage/async-storage';
import catalog from './catalog.json';
import templates from './templates.json';

export type AppLanguage = 'en' | 'hinglish';
const STORAGE_KEY = 'speakly.appLanguage';
let activeStorageKey = STORAGE_KEY + ':guest';
let language: AppLanguage = 'en';
let revision = 0;
const listeners = new Set<() => void>();
export const getAppLanguage = () => language;
export const subscribeLanguage = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const publish = () => listeners.forEach(listener => listener());
export async function initializeLanguage(userId?: string) {
  activeStorageKey = STORAGE_KEY + ':' + (userId || 'guest');
  language = 'en';
  const initialRevision = ++revision;
  publish();
  try {
    const saved = await AsyncStorage.getItem(activeStorageKey);
    if (
      revision === initialRevision &&
      (saved === 'en' || saved === 'hinglish')
    ) {
      language = saved;
      publish();
    }
  } catch {
    /* English remains the default if storage is unavailable. */
  }
}
export async function setAppLanguage(next: AppLanguage) {
  revision++;
  language = next;
  publish();
  await AsyncStorage.setItem(activeStorageKey, next);
}
const dictionary: Record<string, string> = { ...catalog, ...templates };
const extras: Record<string, string> = {
  Language: 'App Ki Bhasha',
  'App Language': 'App Ki Bhasha',
  Account: 'Account',
  Support: 'Madad',
  Security: 'Suraksha',
  'Help & legal': 'Madad Aur Niyam',
  Administration: 'Administration',
  'Edit Profile': 'Profile Badlo',
  Settings: 'Settings',
  Save: 'Save Karo',
  Cancel: 'Cancel',
  Continue: 'Aage Badho',
  'Loading...': 'Load ho raha hai…',
  Home: 'Home',
  Recents: 'Pichhli Calls',
  minutes: 'minutes',
  Visible: 'visible',
  Hidden: 'hidden',
};
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function pattern(value: string) {
  const parts = value.split(/(\{\d+\})/);
  const positions: number[] = [];
  const regex = parts
    .map(part => {
      const match = /^\{(\d+)\}$/.exec(part);
      if (!match) return escape(part);
      positions.push(Number(match[1]));
      return '([\\s\\S]*?)';
    })
    .join('');
  return { regex: new RegExp(`^${regex}$`), positions };
}
const pairs = Object.entries(dictionary);
const dynamicPairs = Object.entries(dictionary)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([hi, en]) => ({
    hi,
    en,
    hiPattern: pattern(hi),
    enPattern: pattern(en),
  }));
const englishLookup = new Map(pairs);
const englishLower = new Map(pairs.map(([hi, en]) => [hi.toLowerCase(), en]));
const hinglishLower = new Map(pairs.map(([hi, en]) => [en.toLowerCase(), hi]));
const hinglishLookup = new Map(pairs.map(([hi, en]) => [en, hi]));
for (const [en, hi] of Object.entries(extras)) hinglishLookup.set(en, hi);
const cleanTerminology = (text: string) =>
  text
    .replace(/language practice/gi, 'Communication')
    .replace(/practice/gi, 'Communication');
export function translate(
  text: string,
  selected: AppLanguage = language,
): string {
  const whitespace = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
  const value = whitespace[2].replace(/\s+/g, ' ');
  let result = (selected === 'en' ? englishLookup : hinglishLookup).get(value);
  if (result === undefined) {
    result = (selected === 'en' ? englishLower : hinglishLower).get(
      value.toLowerCase(),
    );
    if (result && value === value.toUpperCase()) result = result.toUpperCase();
  }
  if (result === undefined) {
    for (const entry of dynamicPairs) {
      const source = selected === 'en' ? entry.hiPattern : entry.enPattern;
      const match = source.regex.exec(value);
      if (!match) continue;
      const variables: Record<number, string> = {};
      source.positions.forEach((position, index) => {
        variables[position] = match[index + 1];
      });
      result = (selected === 'en' ? entry.en : entry.hi).replace(
        /\{(\d+)\}/g,
        (_, index) => variables[Number(index)] || '',
      );
      break;
    }
  }
  return whitespace[1] + cleanTerminology(result ?? value) + whitespace[3];
}
