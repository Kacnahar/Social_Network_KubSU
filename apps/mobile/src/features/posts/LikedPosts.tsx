import type { Post } from '@app/shared';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, ErrorText } from '../../ui/components';
import { type, useColors } from '../../ui/theme';
import { useFeed } from '../feed/useFeed';
import { PostCard } from './PostCard';

// «Мне нравится»: посты с моим сердечком, новые сверху. Пока берём их из загруженной ленты (отдельного
// запроса «мои лайки» на сервере нет); снял сердечко — пост пропадает из списка
export function LikedPosts() {
  const colors = useColors();
  const feed = useFeed();
  const { state } = feed;
  const liked: Post[] = state.status === 'ready' ? state.posts.filter((post) => post.likedByMe) : [];

  return (
    <View>
      {state.status === 'loading' ? <ActivityIndicator accessibilityLabel="Загрузка" color={colors.accent} style={styles.spinner} /> : null}
      {state.status === 'error' ? (
        <View style={styles.notice}>
          <Text style={[type.headline, styles.center, { color: colors.text }]}>Не получилось загрузить посты</Text>
          <ErrorText>{state.message}</ErrorText>
          <Button variant="secondary" title="Повторить" onPress={feed.retry} />
        </View>
      ) : null}
      {state.status === 'ready' && liked.length === 0 ? (
        <Text style={[type.body, styles.center, styles.empty, { color: colors.muted }]}>Здесь появятся посты, которые вам понравились</Text>
      ) : null}
      {liked.map((post) => (
        <PostCard key={post.postId} post={post} now={feed.now} onChanged={feed.replace} onDeleted={feed.remove} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { paddingVertical: 24 },
  notice: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  center: { textAlign: 'center' },
  empty: { paddingVertical: 48 },
});
