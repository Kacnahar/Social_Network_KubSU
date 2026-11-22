import type { Post } from '@app/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Body, Button, Card, CardTitle, ErrorText } from '../../ui/components';
import { useColors } from '../../ui/theme';
import { getProfilePosts } from './api';
import { PostCard } from './PostCard';
import { useFail } from './useFail';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; posts: Post[]; nextCursor: string | null };

// Посты одного человека под карточкой его профиля
export function ProfilePosts({ profileId }: { profileId: string }) {
  const colors = useColors();
  const fail = useFail();
  const { token } = useSignedIn();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [now, setNow] = useState(() => new Date());
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  // Ответ устаревшего запроса (после ухода с экрана или смены профиля) не должен затирать свежий
  const generation = useRef(0);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    try {
      const page = await getProfilePosts(token, profileId);
      if (mine !== generation.current) return;
      setNow(new Date());
      setState({ status: 'ready', posts: page.posts, nextCursor: page.nextCursor });
    } catch (caught) {
      const message = await fail(caught);
      if (mine === generation.current && message !== null) setState({ status: 'error', message });
    }
  }, [token, profileId, fail]);

  // При возврате на экран список обновляется; уже показанные посты не прячем за индикатором
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );

  const retry = () => {
    setState({ status: 'loading' });
    void load();
  };

  const loadMore = async () => {
    if (state.status !== 'ready' || !state.nextCursor) return;
    setMoreError(null);
    setLoadingMore(true);
    try {
      const page = await getProfilePosts(token, profileId, state.nextCursor);
      setState((current) =>
        current.status === 'ready'
          ? { status: 'ready', posts: [...current.posts, ...page.posts], nextCursor: page.nextCursor }
          : current,
      );
    } catch (caught) {
      setMoreError(await fail(caught));
    } finally {
      setLoadingMore(false);
    }
  };

  const replace = (next: Post) =>
    setState((current) =>
      current.status === 'ready' ? { ...current, posts: current.posts.map((post) => (post.postId === next.postId ? next : post)) } : current,
    );
  const remove = (postId: string) =>
    setState((current) =>
      current.status === 'ready' ? { ...current, posts: current.posts.filter((post) => post.postId !== postId) } : current,
    );

  return (
    <View style={styles.list}>
      {state.status === 'loading' ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}

      {state.status === 'error' ? (
        <Card>
          <CardTitle>Не получилось загрузить посты</CardTitle>
          <ErrorText>{state.message}</ErrorText>
          <Button variant="secondary" title="Повторить" onPress={retry} />
        </Card>
      ) : null}

      {state.status === 'ready' && state.posts.length === 0 ? (
        <Card>
          <Body muted>Постов пока нет</Body>
        </Card>
      ) : null}

      {state.status === 'ready'
        ? state.posts.map((post) => <PostCard key={post.postId} post={post} now={now} onChanged={replace} onDeleted={remove} />)
        : null}

      {state.status === 'ready' && state.nextCursor ? (
        <>
          <ErrorText>{moreError}</ErrorText>
          <Button variant="secondary" title="Показать ещё" onPress={() => void loadMore()} loading={loadingMore} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  spinner: { paddingVertical: 12 },
});
