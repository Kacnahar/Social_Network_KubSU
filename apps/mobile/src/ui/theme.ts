import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, type TextStyle } from 'react-native';

// Цвета — системная палитра Apple; на стекле текст чуть контрастнее обычного вторичного
const palette = {
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    glassTint: 'rgba(255,255,255,0.58)',
    glassBorder: 'rgba(255,255,255,0.85)',
    fill: 'rgba(120,120,128,0.14)',
    text: '#000000',
    muted: 'rgba(60,60,67,0.74)',
    border: 'rgba(60,60,67,0.18)',
    accent: '#007AFF',
    accentTint: 'rgba(0,122,255,0.14)',
    onAccent: '#FFFFFF',
    danger: '#D70015',
    dangerTint: 'rgba(255,59,48,0.14)',
    success: '#248A3D',
    shadow: 'rgba(31,38,70,0.16)',
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    glassTint: 'rgba(44,44,46,0.52)',
    glassBorder: 'rgba(255,255,255,0.16)',
    fill: 'rgba(120,120,128,0.28)',
    text: '#FFFFFF',
    muted: 'rgba(235,235,245,0.74)',
    border: 'rgba(84,84,88,0.65)',
    accent: '#0A84FF',
    accentTint: 'rgba(10,132,255,0.22)',
    onAccent: '#FFFFFF',
    danger: '#FF6961',
    dangerTint: 'rgba(255,69,58,0.20)',
    success: '#30D158',
    shadow: 'rgba(0,0,0,0.5)',
  },
};

export type Colors = (typeof palette)['light'] | (typeof palette)['dark'];
export type Scheme = 'light' | 'dark';

export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useColors(): Colors {
  return palette[useScheme()];
}

// Крупный текст — плотнее (отрицательный трекинг), мелкий — свободнее
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.7 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.3 },
  body: { fontSize: 17, lineHeight: 23, fontWeight: '400', letterSpacing: -0.2 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.1 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
} satisfies Record<string, TextStyle>;

export const radius = { card: 26, field: 14, pill: 999 };

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof globalThis.matchMedia !== 'function') return;
    const media = globalThis.matchMedia(query);
    setMatches(media.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => subscription.remove();
  }, []);
  return reduce;
}

// Настройка «Понижение прозрачности»: вместо стекла рисуем сплошные поверхности
export function useReduceTransparency(): boolean {
  const web = useMediaQuery('(prefers-reduced-transparency: reduce)');
  const moreContrast = useMediaQuery('(prefers-contrast: more)');
  const [native, setNative] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setNative);
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setNative);
    return () => subscription.remove();
  }, []);
  return web || moreContrast || native;
}
