import type { RoomPersonaResponse } from '@app/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getPersona } from '../features/rooms/api';
import { ApiError, logout } from './api';
import { disablePush } from './push';
import { clearToken, loadToken, saveToken } from './tokenStorage';

type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'offline' }
  | { status: 'signedIn'; token: string; persona: RoomPersonaResponse };

// Почта, на которую отправлен код: живёт только в памяти, между экранами входа
export type PendingLogin = { email: string; inviteCode?: string; devCode?: string };

type SessionContextValue = {
  state: SessionState;
  pendingLogin: PendingLogin | null;
  setPendingLogin: (pending: PendingLogin | null) => void;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Сервер сказал, что сессия недействительна (или аккаунт удалён) — забываем её локально
  forgetSession: () => Promise<void>;
  setPersona: (persona: RoomPersonaResponse) => void;
  retry: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);

  const forgetSession = useCallback(async () => {
    await clearToken();
    setState({ status: 'signedOut' });
  }, []);

  const loadSession = useCallback(
    async (token: string) => {
      try {
        // Навигации нужно знать, выбран ли ник комнат; когда появится профиль соцсети, сессия будет держать его, а персону — модуль комнат
        setState({ status: 'signedIn', token, persona: await getPersona(token) });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'unauthorized') await forgetSession();
        else setState({ status: 'offline' });
      }
    },
    [forgetSession],
  );

  const restore = useCallback(async () => {
    setState({ status: 'loading' });
    const token = await loadToken();
    if (token) await loadSession(token);
    else setState({ status: 'signedOut' });
  }, [loadSession]);

  useEffect(() => {
    void restore();
  }, [restore]);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      pendingLogin,
      setPendingLogin,
      forgetSession,
      signIn: async (token) => {
        await saveToken(token);
        setPendingLogin(null);
        await loadSession(token);
      },
      signOut: async () => {
        if (state.status === 'signedIn') {
          // Подписку снимаем, пока токен ещё действует
          await disablePush(state.token).catch(() => undefined);
          await logout(state.token).catch(() => undefined);
        }
        await forgetSession();
      },
      setPersona: (persona) => setState((current) => (current.status === 'signedIn' ? { ...current, persona } : current)),
      retry: () => void restore(),
    }),
    [state, pendingLogin, forgetSession, loadSession, restore],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession вызван вне SessionProvider');
  return value;
}

export function useSignedIn(): { token: string; persona: RoomPersonaResponse } {
  const { state } = useSession();
  if (state.status !== 'signedIn') throw new Error('Экран доступен только после входа');
  return state;
}
