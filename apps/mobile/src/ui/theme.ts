import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, type TextStyle } from 'react-native';

// Цвета — своя палитра: глубокий синий (основной), тёплое золото (акцент для «живого»),
// кремовый фон в светлой теме и тёмно-синий вместо чёрного — в тёмной.
// На стекле текст чуть контрастнее обычного вторичного.
const palette = {
  light: {
    background: '#F7F5F0',
    card: '#FFFFFF',
    glassTint: 'rgba(255,255,255,0.62)',
    glassBorder: 'rgba(255,255,255,0.9)',
    fill: 'rgba(31,58,122,0.08)',
    // Фон поля, в которое сейчас вводят: чуть плотнее обычного
    fillActive: 'rgba(31,58,122,0.15)',
    text: '#101A33',
    muted: 'rgba(16,26,51,0.68)',
    border: 'rgba(31,58,122,0.16)',
    accent: '#1F3A7A',
    accentTint: 'rgba(31,58,122,0.12)',
    onAccent: '#FFFFFF',
    // Золото: заливка для важных действий и меток; live — золотой текст, читаемый на светлом фоне
    highlight: '#F2B632',
    highlightTint: 'rgba(242,182,50,0.22)',
    onHighlight: '#1A1300',
    live: '#8A5F00',
    danger: '#D70015',
    dangerTint: 'rgba(255,59,48,0.14)',
    success: '#248A3D',
    shadow: 'rgba(31,58,122,0.16)',
    // Затемнение под всплывающим листом
    scrim: 'rgba(16,26,51,0.38)',
  },
  dark: {
    background: '#0B1530',
    card: '#15224A',
    glassTint: 'rgba(27,42,84,0.55)',
    glassBorder: 'rgba(255,255,255,0.14)',
    fill: 'rgba(140,160,220,0.20)',
    fillActive: 'rgba(140,160,220,0.32)',
    text: '#FFFFFF',
    muted: 'rgba(225,231,250,0.74)',
    border: 'rgba(120,140,200,0.38)',
    // На тёмно-синем фоне глубокий синий не виден, поэтому основной цвет светлее, а текст на нём — тёмный
    accent: '#8FB0FF',
    accentTint: 'rgba(143,176,255,0.20)',
    onAccent: '#0B1530',
    highlight: '#F2B632',
    highlightTint: 'rgba(242,182,50,0.20)',
    onHighlight: '#1A1300',
    live: '#F2B632',
    danger: '#FF6961',
    dangerTint: 'rgba(255,69,58,0.20)',
    success: '#30D158',
    shadow: 'rgba(0,0,0,0.5)',
    scrim: 'rgba(0,0,0,0.55)',
  },
};

export type Colors = (typeof palette)['light'] | (typeof palette)['dark'];
export type Scheme = 'light' | 'dark';

// Часть экранов всегда тёмная, какой бы ни была тема телефона (комната войса): обернуть в <ForceScheme scheme="dark">
const SchemeOverride = createContext<Scheme | null>(null);
export const ForceScheme = ({ scheme, children }: { scheme: Scheme; children: ReactNode }) =>
  createElement(SchemeOverride.Provider, { value: scheme }, children);

export function useScheme(): Scheme {
  const forced = useContext(SchemeOverride);
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  return forced ?? system;
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
  // Самый мелкий текст: подписи под вкладками нижнего меню
  caption: { fontSize: 10, lineHeight: 13, fontWeight: '500', letterSpacing: -0.1 },
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
