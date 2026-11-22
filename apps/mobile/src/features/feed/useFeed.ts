import type { Post } from '@app/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { getFeed } from './api';
import { mergeFirstPage } from './mergeFirstPage';

export type FeedState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; posts: Post[]; nextCursor: string | null };

export type Feed = {
  state: FeedState;
  now: Date;
  refreshing: boolean;
  loadingMore: boolean;
  moreError: string | null;
  retry: () => void;
  refresh: () => void;
  loadMore: () => void;
  replace: (post: Post) => void;
  remove: (postId: string) => void;
};

// Лента всех постов: порциями по мере прокрутки, обновляется при возврате на вкладку и «потянуть вниз»
export function useFeed(): Feed {
  const fail = useFail();
  const { token } = useSignedIn();
  const [state, setState] = useState<FeedState>({ status: 'loading' });
  const [now, setNow] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  // Ответ устаревшего запроса (после ухода с вкладки или обновления) не должен затирать свежий список
  const generation = useRef(0);

  // merge — тихое обновление с сохранением подгруженного; replace — список заново
  const load = useCallback(
    async (mode: 'merge' | 'replace') => {
      const mine = ++generation.current;
      try {
        const page = await getFeed(token);
        if (mine !== generation.current) return;
        setNow(new Date());
        setState((current) => (mode === 'merge' && current.status === 'ready' ? { status: 'ready', ...mergeFirstPage(current, page) } : { status: 'ready', ...page }));
      } catch (caught) {
        const message = await fail(caught);
        if (mine !== generation.current || message === null) return;
        // Сбой тихого обновления не прячет уже показанные посты
        setState((current) => (mode === 'merge' && current.status === 'ready' ? current : { status: 'error', message }));
      }
    },
    [token, fail],
  );

  useFocusEffect(
    useCallback(() => {
      void load('merge');
      return () => {
        generation.current++;
      };
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    void load('replace');
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void load('replace').finally(() => setRefreshing(false));
  }, [load]);

  const loadMore = useCallback(async () => {
    if (state.status !== 'ready' || !state.nextCursor || loadingMoreRef.current) return;
    const mine = generation.current;
    loadingMoreRef.current = true;
    setMoreError(null);
    setLoadingMore(true);
    try {
      const page = await getFeed(token, state.nextCursor);
      if (mine !== generation.current) return;
      setState((current) => {
        if (current.status !== 'ready') return current;
        const seen = new Set(current.posts.map((post) => post.postId));
        return { status: 'ready', posts: [...current.posts, ...page.posts.filter((post) => !seen.has(post.postId))], nextCursor: page.nextCursor };
      });
    } catch (caught) {
      const message = await fail(caught);
      if (mine === generation.current) setMoreError(message);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [state, token, fail]);

  const replace = useCallback(
    (next: Post) =>
      setState((current) =>
        current.status === 'ready' ? { ...current, posts: current.posts.map((post) => (post.postId === next.postId ? next : post)) } : current,
      ),
    [],
  );
  const remove = useCallback(
    (postId: string) =>
      setState((current) => (current.status === 'ready' ? { ...current, posts: current.posts.filter((post) => post.postId !== postId) } : current)),
    [],
  );

  return { state, now, refreshing, loadingMore, moreError, retry, refresh, loadMore: () => void loadMore(), replace, remove };
}
