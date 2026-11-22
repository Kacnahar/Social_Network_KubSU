import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'app.session';

// На телефоне токен лежит в защищённом хранилище системы, в браузере — в localStorage
export async function loadToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, token);
    else await SecureStore.setItemAsync(KEY, token);
  } catch {
    // Хранилище недоступно (например, приватное окно) — вход проживёт до закрытия вкладки
  }
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Нечего удалять
  }
}
