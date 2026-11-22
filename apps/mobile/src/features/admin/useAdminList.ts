import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import { useSession, useSignedIn } from '../../lib/session';

export type AdminListState<T> =
  | { status: 'loading' }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: T[] };

// Загрузка списка админки: смена раздела — индикатор, обновление и «потянуть» — без мигания списка
export function useAdminList<T>(load: (token: string) => Promise<T[]>, key: string) {
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const [state, setState] = useState<AdminListState<T>>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(
    async (silent: boolean) => {
      if (!silent) setState({ status: 'loading' });
      try {
        setState({ status: 'ready', items: await loadRef.current(token) });
      } catch (caught) {
        if (caught instanceof ApiError && caught.code === 'unauthorized') await forgetSession();
        else if (caught instanceof ApiError && caught.code === 'forbidden') setState({ status: 'forbidden' });
        else setState({ status: 'error', message: caught instanceof Error ? caught.message : 'Что-то пошло не так' });
      }
    },
    [token, forgetSession],
  );

  // key меняется при смене раздела или вкладки «Новые / Разобранные»
  useEffect(() => {
    void run(false);
  }, [run, key]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run(true);
    setRefreshing(false);
  }, [run]);

  return { state, refreshing, refresh, retry: () => void run(false), reload: () => void run(true) };
}
