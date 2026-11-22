import type { RoomState } from '@app/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import { getRoomState } from './api';

const POLL_MS = 2500;

// Опрос идёт, пока active: экран открыт и звонок подключён; сбои сети молча ждут следующего опроса
export function useRoomState(
  token: string,
  roomId: string | null,
  active: boolean,
  onUnauthorized: () => void,
): { state: RoomState | null; refresh: () => void } {
  const [state, setState] = useState<RoomState | null>(null);
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;
  // Номер запроса: опоздавший старый ответ не должен затереть свежий
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!roomId) return;
    const mine = ++seq.current;
    try {
      const next = await getRoomState(token, roomId);
      if (mine === seq.current) setState(next);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthorized') onUnauthorizedRef.current();
    }
  }, [token, roomId]);

  useEffect(() => {
    if (!active || !roomId) return;
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      clearInterval(timer);
      seq.current += 1;
    };
  }, [active, roomId, load]);

  const refresh = useCallback(() => void load(), [load]);

  return { state, refresh };
}
