import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

// Никнейм пока хранится только на устройстве (сервера для него нет): по номеру профиля.
// Чужих никнеймов приложение не знает, поэтому показывает только свой.

const KEY = 'app.nicknames';
let current: Record<string, string> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const parse = (text: string | null | undefined): Record<string, string> => {
  try {
    const raw: unknown = text ? JSON.parse(text) : {};
    if (typeof raw !== 'object' || raw === null) return {};
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    return {};
  }
};

try {
  if (Platform.OS === 'web') current = parse(globalThis.localStorage?.getItem(KEY));
  else
    void SecureStore.getItemAsync(KEY)
      .then((saved) => {
        current = { ...parse(saved), ...current };
        emit();
      })
      .catch(() => undefined);
} catch {
  // Не прочиталось — никнеймов нет
}

export function setNickname(profileId: string, nickname: string) {
  current = { ...current, [profileId]: nickname };
  emit();
  try {
    const text = JSON.stringify(current);
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, text);
    else void SecureStore.setItemAsync(KEY, text).catch(() => undefined);
  } catch {
    // Не запомнилось — не страшно
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Никнейм человека или null, если его нет (или он чужой и неизвестен)
export const useNickname = (profileId: string | undefined): string | null =>
  useSyncExternalStore(subscribe, () => (profileId ? (current[profileId] ?? null) : null), () => null);
