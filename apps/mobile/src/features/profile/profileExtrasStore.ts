import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { DEFAULT_EXTRAS, parseExtras, type ProfileExtras } from './profileExtras';

// Хранилище дополнительных настроек профиля на устройстве, по номеру профиля

const KEY = 'app.profileExtras';
let current: Record<string, ProfileExtras> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const parseAll = (text: string | null | undefined): Record<string, ProfileExtras> => {
  try {
    const raw: unknown = text ? JSON.parse(text) : {};
    if (typeof raw !== 'object' || raw === null) return {};
    return Object.fromEntries(Object.entries(raw).map(([id, value]) => [id, parseExtras(value)]));
  } catch {
    return {};
  }
};

try {
  if (Platform.OS === 'web') current = parseAll(globalThis.localStorage?.getItem(KEY));
  else
    void SecureStore.getItemAsync(KEY)
      .then((saved) => {
        current = { ...parseAll(saved), ...current };
        emit();
      })
      .catch(() => undefined);
} catch {
  // Не прочиталось — настройки по умолчанию
}

export function setExtras(profileId: string, extras: ProfileExtras) {
  current = { ...current, [profileId]: extras };
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

export const useExtras = (profileId: string | undefined): ProfileExtras =>
  useSyncExternalStore(subscribe, () => (profileId ? (current[profileId] ?? DEFAULT_EXTRAS) : DEFAULT_EXTRAS), () => DEFAULT_EXTRAS);
