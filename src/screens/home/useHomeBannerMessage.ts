import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

export type HomeBannerMessage = {
  title: string;
  subtitle: string;
};

export const HOME_BANNER_MESSAGES: HomeBannerMessage[] = [
  {
    title: 'Mood Fresh Karna Hai?',
    subtitle: 'Interesting baatein aur good vibes ke liye connect karo!',
  },
  {
    title: 'Baaton Ka Mood Hai?',
    subtitle: 'Ek achhi conversation aapka din bana sakti hai!',
  },
  {
    title: 'Aaj Kuch Dil Ki Baatein Ho Jayein?',
    subtitle: 'Friendly experts ke saath khulkar baat karo!',
  },
  {
    title: 'Boring Day Ko Interesting Banao!',
    subtitle: 'Nayi baatein, naye experiences. Connect Now!',
  },
  {
    title: 'Koi Hai Jo Aapki Baat Sune!',
    subtitle: 'Apne thoughts share karo aur mood fresh karo!',
  },
  {
    title: 'Aaj Ka Mood Kaisa Hai?',
    subtitle: 'Chalo, ek interesting conversation shuru karein!',
  },
  {
    title: 'Bas Ek Call, Aur Mood Fresh!',
    subtitle: 'Achhi baatein aur positive vibes ke liye connect karo!',
  },
  {
    title: 'Akele Bore Ho Rahe Ho?',
    subtitle: 'Friendly conversations se apna din interesting banao!',
  },
];

let previousHomeBannerIndex: number | null = null;

export function selectHomeBannerIndex(
  previousIndex: number | null,
  random: () => number = Math.random,
) {
  const choices = HOME_BANNER_MESSAGES.map((_, index) => index).filter(
    index => index !== previousIndex,
  );
  const randomValue = Math.min(Math.max(random(), 0), 0.9999999999999999);
  return choices[Math.floor(randomValue * choices.length)];
}

export function useHomeBannerMessage() {
  const isFocused = useIsFocused();
  const [selectedIndex, setSelectedIndex] = useState(() =>
    selectHomeBannerIndex(previousHomeBannerIndex),
  );
  const currentIndex = useRef(selectedIndex);
  const previousFocus = useRef<boolean | null>(null);

  useEffect(() => {
    if (isFocused && previousFocus.current === false) {
      const nextIndex = selectHomeBannerIndex(previousHomeBannerIndex);
      previousHomeBannerIndex = nextIndex;
      currentIndex.current = nextIndex;
      setSelectedIndex(nextIndex);
    } else if (isFocused && previousFocus.current === null) {
      previousHomeBannerIndex = currentIndex.current;
    }

    previousFocus.current = isFocused;
  }, [isFocused]);

  return HOME_BANNER_MESSAGES[selectedIndex];
}
