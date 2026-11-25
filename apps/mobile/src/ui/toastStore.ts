import { useSyncExternalStore } from 'react';

// Короткое уведомление внизу экрана («Сохранено»): живёт в памяти, показывается один раз и гаснет само
let current: { id: number; text: string } | null = null;
let counter = 0;
const listeners = new Set<() => void>();

export function showToast(text: string) {
  current = { id: ++counter, text };
  listeners.forEach((listener) => listener());
}

export function clearToast(id: number) {
  if (current?.id !== id) return;
  current = null;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useToast = () => useSyncExternalStore(subscribe, () => current, () => null);
