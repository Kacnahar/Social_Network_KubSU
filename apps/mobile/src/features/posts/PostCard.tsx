import { ROLE_LABEL, can, type Post } from '@app/shared';
import { useRouter } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, Share, StyleSheet, Text, Vibration, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Avatar } from '../../ui/Avatar';
import { Button, ErrorText } from '../../ui/components';
import { CollapseRow } from '../../ui/CollapseRow';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { copyText } from '../../ui/copyText';
import { CommentIcon, DotsIcon, FlagIcon, HeartIcon, LinkIcon, ShareIcon, TrashIcon } from '../../ui/icons';
import { Popover, PopoverItem, PopoverSeparator, useAnchor, type Rect } from '../../ui/Popover';
import { useSound } from '../../ui/soundStore';
import { showToast } from '../../ui/toastStore';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { deletePost, likePost, reportPost, unlikePost } from './api';
import { PostPhotos } from './PostPhotos';
import { formatPostTime } from '../../lib/relativeTime';
import { useFail } from '../../lib/useFail';
import { ReportDialog } from './ReportDialog';

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
  // Меню «⋯» открывается от самой кнопки; жалоба и удаление — отдельные окна
  const menuAnchor = useAnchor();
  const sound = useSound();
  const [menuAt, setMenuAt] = useState<Rect | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState<'delete' | 'report' | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Запускает плавное сворачивание поста; назначается, когда пост нарисован
  const collapse = useRef<(() => void) | null>(null);
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
      setConfirmingDelete(false);
      // Пост плавно исчезает, и только потом убирается из списка
      if (collapse.current) collapse.current();
      else onDeleted(post.postId);
    } catch (caught) {
      setConfirmingDelete(false);
      setError(await fail(caught));
      setBusy(null);
    }
  };

  const report = async (reason: string) => {
    setReportError(null);
    setBusy('report');
    try {
      await reportPost(token, post.postId, reason);
      setReporting(false);
      showToast('Спасибо, мы проверим');
    } catch (caught) {
      setReportError(await fail(caught));
    } finally {
      setBusy(null);
    }
  };

  const openMenu = () => {
    if (Platform.OS === 'android' && sound.vibration) Vibration.vibrate(8);
    menuAnchor.measure(setMenuAt);
  };

  // Ссылка на пост: адрес внутри приложения
  const copyLink = async () => {
    setMenuAt(null);
    const copied = await copyText(ExpoLinking.createURL(`/posts/${post.postId}`));
    if (copied) showToast('Ссылка скопирована');
  };

  const long = !expanded && !showFull && post.text.length > COLLAPSE_AFTER;
  const text = long ? `${post.text.slice(0, COLLAPSE_AFTER).trimEnd()}…` : post.text;

  // Сообщение под постом, когда поделиться с этого устройства не получилось
  const [shareNote, setShareNote] = useState(false);
  const share = async () => {
    setShareNote(false);
    try {
      await Share.share({ message: post.text ? `${post.author.displayName}: ${post.text}` : `Пост: ${post.author.displayName}` });
    } catch {
      setShareNote(true);
    }
  };

  const canReport = !isMine && canReact;

  return (
    <CollapseRow onRemove={() => onDeleted(post.postId)}>
      {(removeRow) => {
        collapse.current = removeRow;
        return (
    <View style={[styles.post, { borderBottomColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть профиль: ${post.author.displayName}`}
        onPress={openAuthor}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Avatar avatarUrl={post.author.avatarUrl} name={post.author.displayName} size={40} />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.head}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Открыть профиль: ${post.author.displayName}`}
            onPress={openAuthor}
            style={({ pressed }) => [styles.author, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text numberOfLines={1} style={[type.headline, styles.name, { color: colors.text }]}>
              {post.author.displayName}
            </Text>
            <Text numberOfLines={1} style={[type.subhead, styles.time, { color: colors.muted }]}>
              {formatPostTime(new Date(post.createdAt), now)}
            </Text>
          </Pressable>
          <Pressable
            ref={menuAnchor.ref}
            accessibilityRole="button"
            accessibilityLabel="Действия с постом"
            onPress={openMenu}
            style={({ pressed }) => [styles.kebab, { opacity: pressed ? 0.5 : 1 }]}
          >
            <DotsIcon color={colors.textSecondary} />
          </Pressable>
        </View>
        {post.author.role !== 'student' ? (
          <Text style={[type.footnote, styles.role, { color: colors.muted }]}>{ROLE_LABEL[post.author.role]}</Text>
        ) : null}

        {post.text ? <Text style={[type.body, styles.text, { color: colors.text }]}>{text}</Text> : null}
        {long ? <Button variant="plain" title="Показать полностью" onPress={() => setShowFull(true)} /> : null}

        {post.photos.length > 0 ? (
          <View style={styles.photos}>
            <PostPhotos photos={post.photos} />
          </View>
        ) : null}

        <View style={styles.actions}>
          {/* Гость лайкать не может: сердце у него не нажимается и только показывает счёт */}
          <Action
            label={canReact ? 'Нравится' : `Нравится: ${shownLike.likeCount}`}
            role={canReact ? 'switch' : 'text'}
            checked={shownLike.likedByMe}
            count={shownLike.likeCount}
            tone={shownLike.likedByMe ? colors.danger : colors.muted}
            onPress={canReact ? () => void toggleLike() : undefined}
          >
            <HeartIcon color={shownLike.likedByMe ? colors.danger : colors.muted} filled={shownLike.likedByMe} background={colors.background} />
          </Action>
          <Action
            label={`Комментарии: ${post.commentCount}`}
            role="button"
            count={post.commentCount}
            tone={colors.muted}
            onPress={expanded ? undefined : open}
          >
            <CommentIcon color={colors.muted} background={colors.background} />
          </Action>
          <Action label="Поделиться" role="button" tone={colors.muted} onPress={() => void share()}>
            <ShareIcon color={colors.muted} />
          </Action>
        </View>
        {shareNote ? <Text style={[type.footnote, { color: colors.muted }]}>Поделиться с этого устройства пока нельзя</Text> : null}
        <ErrorText>{error}</ErrorText>
      </View>

      {/* Меню «⋯»: гость видит только «Скопировать ссылку»; «Пожаловаться» — у чужих постов; «Удалить» — у своих */}
      <Popover visible={menuAt !== null} anchor={menuAt} onClose={() => setMenuAt(null)}>
        <PopoverItem compact first title="Скопировать ссылку" icon={<LinkIcon color={colors.textPrimary} />} onPress={() => void copyLink()} />
        {canReport ? (
          <PopoverItem
            compact
            title="Пожаловаться"
            icon={<FlagIcon color={colors.textPrimary} />}
            onPress={() => {
              setMenuAt(null);
              setReportError(null);
              setReporting(true);
            }}
          />
        ) : null}
        {post.canDelete ? <PopoverSeparator /> : null}
        {post.canDelete ? (
          <PopoverItem
            compact
            first
            danger
            title="Удалить"
            icon={<TrashIcon color={colors.danger} />}
            onPress={() => {
              setMenuAt(null);
              setConfirmingDelete(true);
            }}
          />
        ) : null}
      </Popover>

      <ConfirmDialog
        visible={confirmingDelete}
        title="Удалить пост?"
        message="Это действие нельзя отменить"
        confirmTitle="Удалить"
        cancelTitle="Отмена"
        danger
        loading={busy === 'delete'}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmingDelete(false)}
      />

      <ReportDialog visible={reporting} loading={busy === 'report'} error={reportError} onSend={(reason) => void report(reason)} onCancel={() => setReporting(false)} />
    </View>
        );
      }}
    </CollapseRow>
  );
}

type ActionProps = {
  label: string;
  role: 'button' | 'switch' | 'text';
  checked?: boolean;
  count?: number;
  tone: string;
  onPress?: () => void;
  children: ReactNode;
};

// Иконка со счётчиком под постом; отклик — в момент касания, пружиной без отскока
function Action({ label, role, checked, count, tone, onPress, children }: ActionProps) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const press = (pressed: boolean) => {
    if (reduceMotion || !onPress) return;
    Animated.spring(scale, {
      toValue: pressed ? 0.88 : 1,
      speed: 40,
      bounciness: 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole={role}
        accessibilityLabel={label}
        accessibilityState={role === 'switch' ? { checked } : undefined}
        disabled={!onPress}
        hitSlop={8}
        onPress={onPress}
        onPressIn={() => press(true)}
        onPressOut={() => press(false)}
        style={styles.action}
      >
        {children}
        {count !== undefined && count > 0 ? <Text style={[type.subhead, styles.count, { color: tone }]}>{count}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Пост без карточки и теней: аватар слева, всё остальное справа, снизу тонкая линия на всю ширину экрана
  post: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: -20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  author: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  // Длинное имя сокращается, время видно всегда
  name: { flexShrink: 1 },
  time: { flexShrink: 0 },
  role: { marginTop: -6 },
  text: { marginTop: -2 },
  photos: { marginTop: 4 },
  // Область нажатия «⋯» — не меньше 44×44, сам значок тонкий и серый
  kebab: { width: 44, height: 44, marginRight: -12, marginVertical: -10, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 6, marginLeft: -2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 28 },
  count: { fontVariant: ['tabular-nums'] },
});
