import type { Post } from '@app/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../lib/api';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, LoadingScreen, Screen, Title } from '../../ui/components';
import { getPost } from '../../features/posts/api';
import { CommentsCard } from '../../features/posts/CommentsCard';
import { PostCard } from '../../features/posts/PostCard';

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; post: Post };

export default function PostScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [now] = useState(() => new Date());

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', post: await getPost(token, postId) });
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') await forgetSession();
      else if (caught instanceof ApiError && caught.code === 'not_found') setState({ status: 'missing' });
      else setState({ status: 'error', message: caught instanceof Error ? caught.message : 'Что-то пошло не так' });
    }
  }, [token, postId, forgetSession]);

  useEffect(() => {
    void load();
  }, [load]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const change = (post: Post) => setState({ status: 'ready', post });
  const countChanged = (delta: number) =>
    setState((current) =>
      current.status === 'ready'
        ? { status: 'ready', post: { ...current.post, commentCount: Math.max(0, current.post.commentCount + delta) } }
        : current,
    );

  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'ready') {
    return (
      <Screen align="top">
        <PostCard
          post={state.post}
          now={now}
          expanded
          onChanged={change}
          // Удалённого поста больше нет — возвращаемся туда, откуда пришли
          onDeleted={() => setState({ status: 'missing' })}
        />
        <CommentsCard postId={state.post.postId} now={now} onCountChange={countChanged} />
        <Button variant="plain" title="Назад" onPress={back} />
      </Screen>
    );
  }
  return (
    <Screen>
      <Title>{state.status === 'missing' ? 'Такого поста нет' : 'Не получилось загрузить'}</Title>
      {state.status === 'error' ? <Body muted>{state.message}</Body> : null}
      {state.status === 'error' ? <Button title="Попробовать ещё раз" onPress={() => void load()} /> : null}
      <Button variant={state.status === 'error' ? 'plain' : 'primary'} title="Назад" onPress={back} />
    </Screen>
  );
}
