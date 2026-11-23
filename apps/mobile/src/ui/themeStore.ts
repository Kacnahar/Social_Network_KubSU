import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { isThemeChoice, type ThemeChoice } from './themeChoice';

// Хранилище выбора темы. Запоминается на устройстве: в браузере — в localStorage, на телефоне — в защищённом
// хранилище. Если запомнить не вышло (приватное окно), выбор действует до закрытия приложения

const KEY = 'app.theme';
let current: ThemeChoice = 'system';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

try {
  if (Platform.OS === 'web') {
    const saved = globalThis.localStorage?.getItem(KEY);
    if (isThemeChoice(saved)) current = saved;
  } else {
    void SecureStore.getItemAsync(KEY)
      .then((saved) => {
        if (isThemeChoice(saved) && saved !== current) {
          current = saved;
          emit();
        }
      })
      .catch(() => undefined);
  }
} catch {
  // Память недоступна — остаёмся на «как в системе»
}

export function setThemeChoice(next: ThemeChoice) {
  current = next;
  emit();
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, next);
    else void SecureStore.setItemAsync(KEY, next).catch(() => undefined);
  } catch {
    // Не запомнилось — не страшно
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useThemeChoice = (): ThemeChoice => useSyncExternalStore(subscribe, () => current, () => current);
