import { ROLE_LABEL, can, type Post } from '@app/shared';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Avatar } from '../../ui/Avatar';
import { Body, Button, Card, ErrorText, Separator } from '../../ui/components';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { deletePost, likePost, reportPost, unlikePost } from './api';
import { PostPhotos } from './PostPhotos';
import { formatPostTime } from '../../lib/relativeTime';
import { useFail } from '../../lib/useFail';

const COLLAPSE_AFTER = 600;

type PostCardProps = {
  post: Post;
  now: Date;
  // На экране самого поста текст показывается целиком
  expanded?: boolean;
  onChanged: (post: Post) => void;
  onDeleted: (postId: string) => void;
};

export function PostCard({ post, now, expanded = false, onChanged, onDeleted }: PostCardProps) {
  const router = useRouter();
  const colors = useColors();
  const fail = useFail();
  const { token, account, profile } = useSignedIn();
  const canReact = can(account.role, 'react');
  const isMine = profile?.profileId === post.author.profileId;

  const [showFull, setShowFull] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<'delete' | 'report' | null>(null);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Лайк показываем сразу, не дожидаясь сервера; null — берём данные поста
  const [liking, setLiking] = useState<{ likedByMe: boolean; likeCount: number } | null>(null);

  const shownLike = liking ?? post;
  const open = () => router.push(`/posts/${post.postId}`);
  const openAuthor = () => router.push(isMine ? '/profile' : `/profiles/${post.author.profileId}`);

  const toggleLike = async () => {
    if (liking) return;
    setError(null);
    const next = !post.likedByMe;
    setLiking({ likedByMe: next, likeCount: Math.max(0, post.likeCount + (next ? 1 : -1)) });
    try {
      const result = await (next ? likePost(token, post.postId) : unlikePost(token, post.postId));
      onChanged({ ...post, likeCount: result.likeCount, likedByMe: result.likedByMe });
    } catch (caught) {
      setError(await fail(caught));
    } finally {
      setLiking(null);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy('delete');
    try {
      await deletePost(token, post.postId);
      onDeleted(post.postId);
    } catch (caught) {
      setError(await fail(caught));
      setBusy(null);
    }
  };

  const report = async () => {
    setError(null);
    setBusy('report');
    try {
      await reportPost(token, post.postId);
      setReported(true);
    } catch (caught) {
      setError(await fail(caught));
    } finally {
      setBusy(null);
    }
  };

  const long = !expanded && !showFull && post.text.length > COLLAPSE_AFTER;
  const text = long ? `${post.text.slice(0, COLLAPSE_AFTER).trimEnd()}…` : post.text;

  return (
    <Card>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Открыть профиль: ${post.author.displayName}`}
          onPress={openAuthor}
          style={({ pressed }) => [styles.author, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Avatar avatarUrl={post.author.avatarUrl} name={post.author.displayName} size={40} />
          <View style={styles.authorText}>
            <Text numberOfLines={1} style={[type.headline, { color: colors.text }]}>
              {post.author.displayName}
            </Text>
            <Text numberOfLines={1} style={[type.footnote, { color: colors.muted }]}>
              {ROLE_LABEL[post.author.role]} · {formatPostTime(new Date(post.createdAt), now)}
            </Text>
          </View>
        </Pressable>
        {post.canDelete || !isMine ? (
          <Button variant="plain" title={menuOpen ? 'Скрыть' : 'Ещё'} onPress={() => setMenuOpen((value) => !value)} />
        ) : null}
      </View>

      {menuOpen ? (
        confirmingDelete ? (
          <View style={styles.menu}>
            <Body>Удалить пост? Фото и комментарии тоже исчезнут, отменить это нельзя.</Body>
            <Button variant="danger" title="Да, удалить" onPress={() => void remove()} loading={busy === 'delete'} />
            <Button variant="plain" title="Отмена" onPress={() => setConfirmingDelete(false)} disabled={busy !== null} />
          </View>
        ) : (
          <View style={styles.menuRow}>
            {post.canDelete ? <Button variant="plainDanger" title="Удалить" onPress={() => setConfirmingDelete(true)} /> : null}
            {!isMine ? (
              reported ? (
                <Body muted>Спасибо, мы посмотрим</Body>
              ) : (
                <Button variant="plain" title="Пожаловаться" onPress={() => void report()} loading={busy === 'report'} />
              )
            ) : null}
          </View>
        )
      ) : null}

      {post.text ? <Body>{text}</Body> : null}
      {long ? <Button variant="plain" title="Показать полностью" onPress={() => setShowFull(true)} /> : null}

      <PostPhotos photos={post.photos} />

      <Separator />
      {canReact ? (
        <View style={styles.actions}>
          <LikeButton liked={shownLike.likedByMe} count={shownLike.likeCount} onPress={() => void toggleLike()} />
          {expanded ? (
            <Text style={[type.subhead, { color: colors.muted }]}>Комментарии · {post.commentCount}</Text>
          ) : (
            <Button variant="plain" title={`Комментарии · ${post.commentCount}`} onPress={open} />
          )}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Открыть пост. Нравится: ${post.likeCount}, комментариев: ${post.commentCount}`}
          disabled={expanded}
          onPress={open}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={[type.subhead, { color: colors.muted }]}>
            Нравится: {post.likeCount} · Комментариев: {post.commentCount}
          </Text>
        </Pressable>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function LikeButton({ liked, count, onPress }: { liked: boolean; count: number; onPress: () => void }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  // Отклик — в момент касания, как у обычных кнопок
  const press = (pressed: boolean) => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: pressed ? 0.94 : 1,
      speed: 40,
      bounciness: 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Нравится"
        accessibilityState={{ checked: liked }}
        onPress={onPress}
        onPressIn={() => press(true)}
        onPressOut={() => press(false)}
        style={[styles.like, { backgroundColor: liked ? colors.accent : colors.fill }]}
      >
        <Text style={[type.subhead, styles.likeText, { color: liked ? colors.onAccent : colors.text }]}>
          Нравится · {count}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorText: { flex: 1 },
  menu: { gap: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  like: { minHeight: 44, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  likeText: { fontWeight: '600' },
});
