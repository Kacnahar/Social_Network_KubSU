import type { Post } from '@app/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { mediaUrl } from '../../lib/api';
import { useSignedIn } from '../../lib/session';
import { Button, ErrorText } from '../../ui/components';
import { type, useColors } from '../../ui/theme';
import { getProfilePosts } from './api';
import { PostCard } from './PostCard';
import { useFail } from '../../lib/useFail';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; posts: Post[]; nextCursor: string | null };

type ProfilePostsProps = {
  profileId: string;
  // posts — посты как в ленте; photos — фото из постов сеткой по три
  view?: 'posts' | 'photos';
  // Сообщает наверх, сколько постов загружено и есть ли на сервере ещё — для цифры в шапке профиля
  onCount?: (posts: { count: number; more: boolean }) => void;
};

// Посты одного человека под шапкой его профиля
export function ProfilePosts({ profileId, view = 'posts', onCount }: ProfilePostsProps) {
  const router = useRouter();
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

  const loaded = state.status === 'ready' ? state.posts.length : null;
  const more = state.status === 'ready' && state.nextCursor !== null;
  useEffect(() => {
    if (loaded !== null) onCount?.({ count: loaded, more });
    // onCount — обычно новая функция на каждый рендер; пересчитывать из-за неё не нужно
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, more]);

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

  const photos = state.status === 'ready' ? state.posts.flatMap((post) => post.photos.map((photo) => ({ postId: post.postId, url: photo.url }))) : [];
  const empty = state.status === 'ready' && (view === 'photos' ? photos.length === 0 : state.posts.length === 0);

  return (
    <View>
      {state.status === 'loading' ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}

      {state.status === 'error' ? (
        <View style={styles.notice}>
          <Text style={[type.headline, styles.center, { color: colors.text }]}>Не получилось загрузить посты</Text>
          <ErrorText>{state.message}</ErrorText>
          <Button variant="secondary" title="Повторить" onPress={retry} />
        </View>
      ) : null}

      {empty ? (
        <Text style={[type.body, styles.empty, { color: colors.muted }]}>{view === 'photos' ? 'Фото пока нет' : 'Постов пока нет'}</Text>
      ) : null}

      {state.status === 'ready' && view === 'posts'
        ? state.posts.map((post) => <PostCard key={post.postId} post={post} now={now} onChanged={replace} onDeleted={remove} />)
        : null}

      {view === 'photos' && photos.length > 0 ? (
        <View style={styles.grid}>
          {photos.map((photo, index) => (
            <Pressable
              key={`${photo.postId}-${photo.url}`}
              accessibilityRole="button"
              accessibilityLabel={`Фото ${index + 1} из ${photos.length}. Открыть пост`}
              onPress={() => router.push(`/posts/${photo.postId}`)}
              style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Image source={{ uri: mediaUrl(photo.url) ?? undefined }} style={[styles.image, { backgroundColor: colors.fill }]} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {state.status === 'ready' && state.nextCursor ? (
        <View style={styles.more}>
          <ErrorText>{moreError}</ErrorText>
          <Button variant="secondary" title="Показать ещё" onPress={() => void loadMore()} loading={loadingMore} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { paddingVertical: 24 },
  notice: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  center: { textAlign: 'center' },
  empty: { textAlign: 'center', paddingVertical: 36 },
  // Сетка фото по три в ряд, от края до края экрана, с тонкими промежутками
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -20, gap: 2, paddingTop: 2 },
  cell: { width: '33.33%', maxWidth: '33.33%', flexBasis: '32.9%', flexGrow: 1, aspectRatio: 1 },
  image: { width: '100%', height: '100%' },
  more: { paddingTop: 16, gap: 8 },
});
