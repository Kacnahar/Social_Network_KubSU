import { useCallback } from 'react';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

// Текст ошибки для показа; если сессия недействительна — выходим, и показывать нечего
export function useFail(): (caught: unknown) => Promise<string | null> {
  const { forgetSession } = useSession();
  return useCallback(
    async (caught) => {
      if (caught instanceof ApiError && caught.code === 'unauthorized') {
        await forgetSession();
        return null;
      }
      return caught instanceof Error ? caught.message : 'Что-то пошло не так';
    },
    [forgetSession],
  );
}
