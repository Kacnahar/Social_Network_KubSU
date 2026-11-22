import { type AccountResponse, type Profile, type Role } from '@app/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, getAccount, getProfile, logout } from './api';
import { disablePush } from './push';
import { clearToken, loadToken, saveToken } from './tokenStorage';

type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'offline' }
  | { status: 'signedIn'; token: string; account: AccountResponse; profile: Profile | null };

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
  setProfile: (profile: Profile) => void;
  // Бан могли выдать или снять, пока приложение открыто; сбой молча игнорируем — останутся прежние данные
  refreshAccount: () => Promise<void>;
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
        // Навигации нужно знать роль и есть ли профиль; персону комнат грузит сам модуль комнат
        const [account, profile] = await Promise.all([getAccount(token), getProfile(token)]);
        setState({ status: 'signedIn', token, account, profile });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'unauthorized') await forgetSession();
        else setState({ status: 'offline' });
      }
    },
    [forgetSession],
  );

  // Ссылка стабильна: от неё зависят эффекты фокуса экранов, иначе обновление аккаунта зациклится
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = state.status === 'signedIn' ? state.token : null;
  const refreshAccount = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const account = await getAccount(token);
      setState((current) => (current.status === 'signedIn' && current.token === token ? { ...current, account } : current));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthorized') await forgetSession();
    }
  }, [forgetSession]);

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
      setProfile: (profile) => setState((current) => (current.status === 'signedIn' ? { ...current, profile } : current)),
      refreshAccount,
      retry: () => void restore(),
    }),
    [state, pendingLogin, forgetSession, loadSession, restore, refreshAccount],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession вызван вне SessionProvider');
  return value;
}

export function useSignedIn(): { token: string; account: AccountResponse; profile: Profile | null } {
  const { state } = useSession();
  if (state.status !== 'signedIn') throw new Error('Экран доступен только после входа');
  return state;
}

export function useRole(): Role {
  return useSignedIn().account.role;
}
