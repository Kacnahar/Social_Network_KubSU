import type { RoomPersonaResponse } from '@app/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import { getPersona } from './api';

export type PersonaState = {
  status: 'loading' | 'ready' | 'error';
  persona: RoomPersonaResponse | null;
  reload: () => void;
  setPersona: (persona: RoomPersonaResponse) => void;
};

// Персону грузим только на экранах комнат: сервер создаёт её при первом обращении и только у студента
export function usePersona(token: string, onUnauthorized?: () => void): PersonaState {
  const [status, setStatus] = useState<PersonaState['status']>('loading');
  const [persona, setPersonaValue] = useState<RoomPersonaResponse | null>(null);
  const [attempt, setAttempt] = useState(0);
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  useEffect(() => {
    // Отмена нужна, чтобы устаревший ответ не затёр свежий
    let cancelled = false;
    getPersona(token).then(
      (next) => {
        if (cancelled) return;
        setPersonaValue(next);
        setStatus('ready');
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === 'unauthorized') onUnauthorizedRef.current?.();
        setStatus('error');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const reload = useCallback(() => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  const setPersona = useCallback((next: RoomPersonaResponse) => {
    setPersonaValue(next);
    setStatus('ready');
  }, []);

  return { status, persona, reload, setPersona };
}
