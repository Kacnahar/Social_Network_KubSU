import type { StoryGroup } from '@app/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { Body, Button, LoadingScreen, Screen, Title } from '../../ui/components';
import { getStories } from '../../features/stories/api';
import { StoryViewer } from '../../features/stories/StoryViewer';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; group: StoryGroup | null };

export default function StoriesScreen() {
  const router = useRouter();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const fail = useFail();
  const { token } = useSignedIn();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  // Возврат на ленту обновит кружки: вкладка снова получает фокус
  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const { groups } = await getStories(token);
      setState({ status: 'ready', group: groups.find((group) => group.author.profileId === profileId && group.stories.length > 0) ?? null });
    } catch (caught) {
      const message = await fail(caught);
      if (message) setState({ status: 'error', message });
    }
  }, [token, profileId, fail]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'ready' && state.group) return <StoryViewer group={state.group} onClose={close} />;
  return (
    <Screen>
      <StatusBar style="auto" />
      <Title>{state.status === 'error' ? 'Не получилось загрузить' : 'Историй нет'}</Title>
      {state.status === 'error' ? <Body muted>{state.message}</Body> : null}
      {state.status === 'error' ? <Button title="Повторить" onPress={() => void load()} /> : null}
      <Button variant={state.status === 'error' ? 'plain' : 'primary'} title="Закрыть" onPress={close} />
    </Screen>
  );
}
