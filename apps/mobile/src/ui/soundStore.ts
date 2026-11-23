import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { DEFAULT_SOUND, parseSound, type SoundSettings } from './soundSettings';

// Настройки звука запоминаются только на устройстве (в браузере — localStorage, на телефоне — защищённое хранилище)

const KEY = 'app.sound';
let current: SoundSettings = DEFAULT_SOUND;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

try {
  if (Platform.OS === 'web') {
    const saved = globalThis.localStorage?.getItem(KEY);
    if (saved) current = parseSound(JSON.parse(saved));
  } else {
    void SecureStore.getItemAsync(KEY)
      .then((saved) => {
        if (saved) {
          current = parseSound(JSON.parse(saved));
          emit();
        }
      })
      .catch(() => undefined);
  }
} catch {
  // Не прочиталось — остаются настройки по умолчанию
}

export function updateSound(patch: Partial<SoundSettings>) {
  current = { ...current, ...patch };
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

export const useSound = (): SoundSettings => useSyncExternalStore(subscribe, () => current, () => current);
