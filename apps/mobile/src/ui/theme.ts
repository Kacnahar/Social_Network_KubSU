import { resolveScheme } from './themeChoice';
import { useThemeChoice } from './themeStore';
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, type TextStyle } from 'react-native';

// ПАЛИТРА: чёрно-белая (монохром). Единственное место, где в приложении записаны цвета: на экранах и в элементах
// пишем только имена (`colors.primary`, `colors.textSecondary` …), а не коды вроде #111111.
//
// primary — основные кнопки и активные элементы (в светлой теме чёрный, в тёмной белый); onPrimary — текст на них.
// Золото (premiumGold, softGold) — ТОЛЬКО премиум-подписка, эксклюзивные функции и значки, больше нигде.
// success / warning / error — только по назначению (удалось / внимание / ошибка и опасные действия).

// Особые цвета, одинаковые в обеих темах
export const special = {
  premiumGold: '#D4AF37',
  softGold: '#F3E5B0',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

// Базовые цвета тем
const base = {
  light: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceSecondary: '#E8EDF3',
    primary: '#111111',
    textPrimary: '#111111',
    textSecondary: '#64748B',
    border: '#D1D5DB',
  },
  dark: {
    background: '#0F1117',
    surface: '#1F2937',
    surfaceSecondary: '#374151',
    primary: '#FFFFFF',
    textPrimary: '#F8FAFC',
    textSecondary: '#9CA3AF',
    border: '#374151',
  },
} as const;

// Рабочие цвета приложения: базовые + производные (полупрозрачные оттенки тех же цветов).
// Старые имена (card, fill, text, muted, accent, highlight …) сохранены, чтобы экраны не переписывать:
// «акцент» теперь тоже primary, то есть чёрно-белый.
const palette = {
  light: {
    ...base.light,
    ...special,
    accent: base.light.primary,
    onPrimary: '#FFFFFF',
    onSoft: base.light.primary,
    card: base.light.surface,
    glassTint: 'rgba(255,255,255,0.72)',
    glassBorder: base.light.border,
    fill: base.light.surfaceSecondary,
    // Поле ввода, в которое сейчас вводят: чуть темнее обычного
    fillActive: base.light.border,
    text: base.light.textPrimary,
    muted: base.light.textSecondary,
    accentTint: 'rgba(17,17,17,0.08)',
    onAccent: '#FFFFFF',
    highlight: base.light.primary,
    highlightTint: 'rgba(17,17,17,0.08)',
    onHighlight: '#FFFFFF',
    live: base.light.primary,
    danger: special.error,
    dangerTint: 'rgba(239,68,68,0.10)',
    // Светлая тема: мягкие тени
    shadow: 'rgba(17,17,17,0.10)',
    scrim: 'rgba(17,17,17,0.40)',
  },
  dark: {
    ...base.dark,
    ...special,
    accent: base.dark.primary,
    onPrimary: '#111111',
    onSoft: base.dark.primary,
    card: base.dark.surface,
    glassTint: 'rgba(31,41,55,0.72)',
    glassBorder: base.dark.border,
    fill: base.dark.surfaceSecondary,
    fillActive: 'rgba(255,255,255,0.16)',
    text: base.dark.textPrimary,
    muted: base.dark.textSecondary,
    accentTint: 'rgba(255,255,255,0.12)',
    onAccent: '#111111',
    highlight: base.dark.primary,
    highlightTint: 'rgba(255,255,255,0.12)',
    onHighlight: '#111111',
    live: base.dark.primary,
    danger: special.error,
    dangerTint: 'rgba(239,68,68,0.18)',
    // Тёмная тема: вместо теней — тонкие границы
    shadow: 'transparent',
    scrim: 'rgba(0,0,0,0.60)',
  },
};

// Для экранов, которым нужна тёмная палитра независимо от темы (просмотр историй, комната)
export const darkColors = palette.dark;

export type Colors = (typeof palette)['light'] | (typeof palette)['dark'];
export type Scheme = 'light' | 'dark';

// Часть экранов всегда тёмная, какой бы ни была тема телефона (комната войса): обернуть в <ForceScheme scheme="dark">
const SchemeOverride = createContext<Scheme | null>(null);
export const ForceScheme = ({ scheme, children }: { scheme: Scheme; children: ReactNode }) =>
  createElement(SchemeOverride.Provider, { value: scheme }, children);

export function useScheme(): Scheme {
  const forced = useContext(SchemeOverride);
  const choice = useThemeChoice();
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  // Комната всегда тёмная; иначе — выбор человека («как в системе» повторяет тему телефона)
  return forced ?? resolveScheme(choice, system);
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

// control — аккуратно скруглённые маленькие кнопки и бейджи (тонкие кнопки профиля, бейдж роли)
export const radius = { card: 26, field: 14, control: 9, pill: 999 };

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
