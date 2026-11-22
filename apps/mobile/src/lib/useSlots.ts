import type { Slot } from '@rooms/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, getSlots } from './api';

const REFRESH_MS = 60_000;

export type SlotsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; slots: Slot[]; now: Date };

// Список обновляется при открытии и раз в минуту; при сбое фоновой загрузки остаётся прежний список
export function useSlots(token: string, onUnauthorized: () => void): { state: SlotsState; reload: () => void } {
  const [state, setState] = useState<SlotsState>({ status: 'loading' });
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const load = useCallback(async () => {
    try {
      const { slots } = await getSlots(token);
      setState({ status: 'ready', slots, now: new Date() });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthorized') {
        onUnauthorizedRef.current();
        return;
      }
      const message = error instanceof Error ? error.message : 'Не удалось загрузить расписание';
      setState((current) => (current.status === 'ready' ? { ...current, now: new Date() } : { status: 'error', message }));
    }
  }, [token]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    void load();
  }, [load]);

  return { state, reload };
}
