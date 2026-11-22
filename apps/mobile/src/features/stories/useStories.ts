import type { StoryGroup } from '@app/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { getStories } from './api';

export type Stories = {
  // null — ещё не загрузились или не получилось: ряд тогда просто не показываем
  groups: StoryGroup[] | null;
  reload: () => Promise<void>;
};

// Истории для ряда кружков: грузятся при открытии ленты и при возврате на вкладку (в том числе с просмотра)
export function useStories(): Stories {
  const fail = useFail();
  const { token } = useSignedIn();
  const [groups, setGroups] = useState<StoryGroup[] | null>(null);
  // Ответ устаревшего запроса не должен затирать свежий список
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    try {
      const response = await getStories(token);
      if (mine === generation.current) setGroups(response.groups);
    } catch (caught) {
      // Сбой не прячет уже показанные кружки; при недействительной сессии fail сам выйдет из аккаунта
      await fail(caught);
    }
  }, [token, fail]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => {
        generation.current++;
      };
    }, [reload]),
  );

  return { groups, reload };
}
