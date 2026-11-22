import { can, type Post } from '@app/shared';
import { useRouter } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Button, Card, CardTitle, ErrorText, useTabBarSpace } from '../../ui/components';
import { type, useColors } from '../../ui/theme';
import { PostCard } from '../posts/PostCard';
import { useFeed } from './useFeed';

type Row = { key: string; kind: 'pinned' } | { key: string; kind: 'post'; post: Post };

type FeedListProps = {
  // Над списком, прокручивается вместе с ним (заголовок, истории)
  header: ReactNode;
  // Строка, которая при прокрутке остаётся вверху экрана
  pinned?: ReactNode;
};

export function FeedList({ header, pinned }: FeedListProps) {
  const router = useRouter();
  const colors = useColors();
  const space = useTabBarSpace();
  const { account } = useSignedIn();
  const feed = useFeed();
  const { state } = feed;

  const rows: Row[] = [
    ...(pinned ? [{ key: 'pinned', kind: 'pinned' } as const] : []),
    ...(state.status === 'ready' ? state.posts.map((post) => ({ key: post.postId, kind: 'post', post }) as const) : []),
  ];

  const footer = (
    <View style={styles.footer}>
      {state.status === 'loading' ? <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} /> : null}

      {state.status === 'error' ? (
        <Card>
          <CardTitle>Не получилось загрузить ленту</CardTitle>
          <ErrorText>{state.message}</ErrorText>
          <Button variant="secondary" title="Повторить" onPress={feed.retry} />
        </Card>
      ) : null}

      {state.status === 'ready' && state.posts.length === 0 ? (
        <Card>
          <CardTitle>Пока никто ничего не написал</CardTitle>
          {can(account.role, 'publish') ? <Button title="Написать первый пост" onPress={() => router.navigate('/create')} /> : null}
        </Card>
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
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={({ item }) =>
        item.kind === 'pinned' ? (
          // Сплошная подложка: посты, уходящие под строку, не должны просвечивать сквозь стекло
          <View style={[styles.pinned, { backgroundColor: colors.background }]}>{pinned}</View>
        ) : (
          <View style={styles.item}>
            <PostCard post={item.post} now={feed.now} onChanged={feed.replace} onDeleted={feed.remove} />
          </View>
        )
      }
      ListHeaderComponent={<View style={styles.header}>{header}</View>}
      ListFooterComponent={footer}
      stickyHeaderIndices={pinned ? [1] : undefined}
      onEndReached={feed.loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.accent} />}
      contentContainerStyle={[styles.content, { paddingBottom: space || 28 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 28 },
  header: { gap: 16, paddingBottom: 16 },
  pinned: { paddingBottom: 12 },
  item: { paddingBottom: 16 },
  footer: { gap: 16 },
  spinner: { paddingVertical: 24 },
  end: { textAlign: 'center', paddingVertical: 8 },
});
