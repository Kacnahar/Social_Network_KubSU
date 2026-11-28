import { useSyncExternalStore } from 'react';

// «Избранное» на странице объявления (♡ в шапке). Сервера для него пока нет — живёт в памяти приложения до перезапуска.
let favorites = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useIsFavorite = (adId: string): boolean => useSyncExternalStore(subscribe, () => favorites.has(adId), () => false);

export function toggleFavorite(adId: string) {
  favorites = new Set(favorites);
  if (!favorites.delete(adId)) favorites.add(adId);
  listeners.forEach((listener) => listener());
}
