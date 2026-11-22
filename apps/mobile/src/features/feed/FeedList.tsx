import { can, type Post } from '@app/shared';
import { useRouter } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Button, ErrorText, useTabBarSpace } from '../../ui/components';
import { type, useColors } from '../../ui/theme';
import { PostCard } from '../posts/PostCard';
import { StoriesRow } from '../stories/StoriesRow';
import { useStories } from '../stories/useStories';
import { useFeed } from './useFeed';

type FeedListProps = {
  // Над списком, прокручивается вместе с ним (шапка); под ней идут истории
  header: ReactNode;
};

export function FeedList({ header }: FeedListProps) {
  const router = useRouter();
  const colors = useColors();
  const space = useTabBarSpace();
  const { account } = useSignedIn();
  const feed = useFeed();
  const stories = useStories();
  const { reload: reloadStories } = stories;
  const { state } = feed;

  const posts: Post[] = state.status === 'ready' ? state.posts : [];

  // «Потянуть, чтобы обновить» обновляет и ленту, и истории
  const refresh = () => {
    feed.refresh();
    void reloadStories();
  };

  const footer = (
    <View style={styles.footer}>
      {state.status === 'loading' ? <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} /> : null}

      {state.status === 'error' ? (
        <View style={styles.notice}>
          <Text style={[type.headline, styles.center, { color: colors.text }]}>Не получилось загрузить ленту</Text>
          <ErrorText>{state.message}</ErrorText>
          <Button variant="secondary" title="Повторить" onPress={feed.retry} />
        </View>
      ) : null}

      {state.status === 'ready' && state.posts.length === 0 ? (
        <View style={styles.notice}>
          <Text style={[type.headline, styles.center, { color: colors.text }]}>Пока никто ничего не написал</Text>
          {can(account.role, 'publish') ? (
            <Button variant="secondary" title="Написать первый пост" onPress={() => router.push('/compose')} />
          ) : null}
        </View>
      ) : null}

      {feed.moreError ? (
        <Fragment>
          <ErrorText>{feed.moreError}</ErrorText>
          <Button variant="secondary" title="Повторить" onPress={feed.loadMore} />
        </Fragment>
      ) : feed.loadingMore ? (
        <ActivityIndicator color={colors.muted} />
      ) : null}

      {state.status === 'ready' && state.posts.length > 0 && !state.nextCursor ? (
        <Text style={[type.footnote, styles.end, { color: colors.muted }]}>Это все посты</Text>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(post) => post.postId}
      renderItem={({ item }) => <PostCard post={item} now={feed.now} onChanged={feed.replace} onDeleted={feed.remove} />}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          <StoriesRow groups={stories.groups} />
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
        </View>
      }
      ListFooterComponent={footer}
      onEndReached={feed.loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      contentContainerStyle={[styles.content, { paddingBottom: space || 28 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20 },
  header: { gap: 16 },
  // Тонкая линия под историями — на всю ширину экрана, как разделители между постами
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: -20 },
  footer: { gap: 16, paddingTop: 16 },
  notice: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  center: { textAlign: 'center' },
  spinner: { paddingVertical: 24 },
  end: { textAlign: 'center', paddingVertical: 8 },
});
