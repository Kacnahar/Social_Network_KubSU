import { COMMENT_TEXT_MAX, type Comment } from '@app/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatPostTime } from '../../lib/relativeTime';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { Avatar } from '../../ui/Avatar';
import { Button, ErrorText, noOutline } from '../../ui/components';
import { CloseIcon, HeartIcon, SendIcon } from '../../ui/icons';
import { plural } from '../../ui/plural';
import { type, useColors } from '../../ui/theme';
import { addComment, deleteComment, getComments, reportComment } from './api';
import { buildThreads, isCommentLiked, parentOfComment, rememberReply, toggleCommentLike, visibleReplies, type Thread } from './commentThreads';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; comments: Comment[]; nextCursor: string | null };

// Комментарии одного поста: загрузка, отправка, ответ. Список и поле ввода рисуются отдельно,
// потому что поле закреплено внизу экрана, а список прокручивается вместе с постом
export function useComments(postId: string, onCountChange: (delta: number) => void) {
  const fail = useFail();
  const { token } = useSignedIn();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const page = await getComments(token, postId);
      setState({ status: 'ready', comments: page.comments, nextCursor: page.nextCursor });
    } catch (caught) {
      const message = await fail(caught);
      if (message !== null) setState({ status: 'error', message });
    }
  }, [token, postId, fail]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (state.status !== 'ready' || !state.nextCursor) return;
    setMoreError(null);
    setLoadingMore(true);
    try {
      const page = await getComments(token, postId, state.nextCursor);
      setState((current) => {
        if (current.status !== 'ready') return current;
        // Свой только что отправленный комментарий может прийти и в следующей порции
        const known = new Set(current.comments.map((comment) => comment.commentId));
        const fresh = page.comments.filter((comment) => !known.has(comment.commentId));
        return { status: 'ready', comments: [...current.comments, ...fresh], nextCursor: page.nextCursor };
      });
    } catch (caught) {
      setMoreError(await fail(caught));
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (text === '' || sending) return;
    setSendError(null);
    setSending(true);
    try {
      const comment = await addComment(token, postId, text);
      if (replyTo) rememberReply(comment.commentId, replyTo.commentId);
      setState((current) => (current.status === 'ready' ? { ...current, comments: [...current.comments, comment] } : current));
      setDraft('');
      setReplyTo(null);
      onCountChange(1);
    } catch (caught) {
      setSendError(await fail(caught));
    } finally {
      setSending(false);
    }
  };

  const removed = (commentId: string) => {
    setState((current) =>
      current.status === 'ready' ? { ...current, comments: current.comments.filter((comment) => comment.commentId !== commentId) } : current,
    );
    onCountChange(-1);
  };

  return { state, load, loadMore, loadingMore, moreError, draft, setDraft, replyTo, setReplyTo, send, sending, sendError, removed };
}

type CommentsApi = ReturnType<typeof useComments>;

type CommentListProps = { comments: CommentsApi; now: Date; canReact: boolean; onReply: (comment: Comment) => void };

export function CommentList({ comments, now, canReact, onReply }: CommentListProps) {
  const colors = useColors();
  const { state } = comments;
  const threads = state.status === 'ready' ? buildThreads(state.comments, parentOfComment) : [];

  return (
    <View style={styles.list}>
      {state.status === 'loading' ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
      {state.status === 'error' ? (
        <View style={styles.notice}>
          <ErrorText>{state.message}</ErrorText>
          <Button variant="secondary" title="Повторить" onPress={() => void comments.load()} />
        </View>
      ) : null}
      {state.status === 'ready' && threads.length === 0 ? (
        <Text style={[type.body, styles.empty, { color: colors.muted }]}>
          Пока нет комментариев.{canReact ? ' Будьте первым' : ''}
        </Text>
      ) : null}

      {threads.map((thread) => (
        <ThreadView key={thread.comment.commentId} thread={thread} now={now} canReact={canReact} onReply={onReply} onRemoved={comments.removed} />
      ))}

      {state.status === 'ready' && state.nextCursor ? (
        <View style={styles.notice}>
          <ErrorText>{comments.moreError}</ErrorText>
          <Button variant="secondary" title="Показать ещё" onPress={() => void comments.loadMore()} loading={comments.loadingMore} />
        </View>
      ) : null}
    </View>
  );
}

type RowHandlers = { now: Date; canReact: boolean; onReply: (comment: Comment) => void; onRemoved: (commentId: string) => void };

function ThreadView({ thread, ...handlers }: { thread: Thread } & RowHandlers) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const { shown, hidden } = visibleReplies(thread.replies, expanded);

  return (
    <View>
      <CommentRow comment={thread.comment} {...handlers} />
      {shown.length > 0 ? (
        // Ответы сдвинуты вправо, слева — тонкая вертикальная линия
        <View style={[styles.replies, { borderLeftColor: colors.border }]}>
          {shown.map((reply) => (
            <CommentRow key={reply.commentId} comment={reply} small {...handlers} />
          ))}
          {hidden > 0 ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setExpanded(true)} style={({ pressed }) => [styles.moreReplies, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[type.footnote, styles.link, { color: colors.accent }]}>
                Показать ещё {hidden} {plural(hidden, 'ответ', 'ответа', 'ответов')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CommentRow({ comment, small = false, now, canReact, onReply, onRemoved }: { comment: Comment; small?: boolean } & RowHandlers) {
  const router = useRouter();
  const colors = useColors();
  const fail = useFail();
  const { token, profile } = useSignedIn();
  const isMine = profile?.profileId === comment.author.profileId;
  // Действия открываются долгим нажатием: «Удалить» — у своего, «Пожаловаться» — у чужого
  const [menu, setMenu] = useState<'closed' | 'open' | 'confirm'>('closed');
  const [busy, setBusy] = useState<'delete' | 'report' | null>(null);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(() => isCommentLiked(comment.commentId));

  const remove = async () => {
    setError(null);
    setBusy('delete');
    try {
      await deleteComment(token, comment.commentId);
      onRemoved(comment.commentId);
    } catch (caught) {
      setError(await fail(caught));
      setBusy(null);
    }
  };

  const report = async () => {
    setError(null);
    setBusy('report');
    try {
      await reportComment(token, comment.commentId);
      setReported(true);
      setMenu('closed');
    } catch (caught) {
      setError(await fail(caught));
    } finally {
      setBusy(null);
    }
  };

  const like = () => {
    toggleCommentLike(comment.commentId);
    setLiked(isCommentLiked(comment.commentId));
  };

  const hasActions = comment.canDelete || !isMine;

  return (
    <Pressable
      accessibilityLabel={`${comment.author.displayName}: ${comment.text}`}
      accessibilityHint={hasActions ? 'Долгое нажатие открывает действия' : undefined}
      onLongPress={hasActions ? () => setMenu('open') : undefined}
      delayLongPress={350}
      style={[styles.row, menu !== 'closed' && { backgroundColor: colors.fill }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть профиль: ${comment.author.displayName}`}
        onPress={() => router.push(isMine ? '/profile' : `/profiles/${comment.author.profileId}`)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Avatar avatarUrl={comment.author.avatarUrl} name={comment.author.displayName} size={small ? 26 : 32} />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.head}>
          <Text numberOfLines={1} style={[type.subhead, styles.name, { color: colors.text }]}>
            {comment.author.displayName}
          </Text>
          <Text numberOfLines={1} style={[type.footnote, styles.time, { color: colors.muted }]}>
            {formatPostTime(new Date(comment.createdAt), now)}
          </Text>
        </View>
        <Text style={[type.body, { color: colors.text }]}>{comment.text}</Text>

        {canReact ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Нравится"
              accessibilityState={{ checked: liked }}
              hitSlop={8}
              onPress={like}
              style={({ pressed }) => [styles.like, { opacity: pressed ? 0.6 : 1 }]}
            >
              <HeartIcon color={liked ? colors.danger : colors.muted} filled={liked} background={menu !== 'closed' ? colors.card : colors.background} size={16} />
              {liked ? <Text style={[type.footnote, { color: colors.danger }]}>1</Text> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Ответить: ${comment.author.displayName}`} hitSlop={8} onPress={() => onReply(comment)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={[type.footnote, styles.link, { color: colors.muted }]}>Ответить</Text>
            </Pressable>
          </View>
        ) : null}

        {reported ? <Text style={[type.footnote, { color: colors.muted }]}>Спасибо, мы посмотрим</Text> : null}

        {menu === 'open' ? (
          <View style={styles.menu}>
            {comment.canDelete ? <Button size="compact" variant="plainDanger" title="Удалить" onPress={() => setMenu('confirm')} /> : null}
            {!isMine && !reported ? (
              <Button size="compact" variant="plain" title="Пожаловаться" onPress={() => void report()} loading={busy === 'report'} />
            ) : null}
            <Button size="compact" variant="plain" title="Отмена" onPress={() => setMenu('closed')} disabled={busy !== null} />
          </View>
        ) : null}
        {menu === 'confirm' ? (
          <View style={styles.menu}>
            <Button size="compact" variant="danger" title="Да, удалить" onPress={() => void remove()} loading={busy === 'delete'} />
            <Button size="compact" variant="plain" title="Отмена" onPress={() => setMenu('closed')} disabled={busy !== null} />
          </View>
        ) : null}
        <ErrorText>{error}</ErrorText>
      </View>
    </Pressable>
  );
}

// Поле «Написать комментарий…», закреплённое внизу экрана: аватар, ввод и круглая кнопка отправки.
// При ответе над полем — плашка «Ответ для Имя ✕»
export function CommentComposer({ comments, focusKey }: { comments: CommentsApi; focusKey: number }) {
  const colors = useColors();
  const { profile } = useSignedIn();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const canSend = comments.draft.trim() !== '' && !comments.sending;

  // «Ответить» ставит курсор в поле
  useEffect(() => {
    if (focusKey > 0) input.current?.focus();
  }, [focusKey]);

  return (
    <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
      {comments.replyTo ? (
        <View style={[styles.replyChip, { backgroundColor: colors.accentTint }]}>
          <Text numberOfLines={1} style={[type.footnote, styles.replyText, { color: colors.accent }]}>
            Ответ для {comments.replyTo.author.displayName}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Отменить ответ" hitSlop={10} onPress={() => comments.setReplyTo(null)}>
            <CloseIcon color={colors.accent} size={11} />
          </Pressable>
        </View>
      ) : null}
      <ErrorText>{comments.sendError}</ErrorText>
      <View style={styles.composerRow}>
        <Avatar avatarUrl={profile?.avatarUrl ?? null} name={profile?.displayName ?? ''} size={32} />
        <TextInput
          ref={input}
          accessibilityLabel="Написать комментарий"
          value={comments.draft}
          onChangeText={comments.setDraft}
          placeholder="Написать комментарий…"
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          maxLength={COMMENT_TEXT_MAX}
          autoCapitalize="sentences"
          autoCorrect
          multiline
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[type.body, styles.input, noOutline, { color: colors.text, backgroundColor: focused ? colors.fillActive : colors.fill }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Отправить"
          accessibilityState={{ disabled: !canSend, busy: comments.sending }}
          disabled={!canSend}
          onPress={() => void comments.send()}
          style={({ pressed }) => [styles.send, { backgroundColor: colors.primary, opacity: !canSend ? 0.4 : pressed ? 0.8 : 1 }]}
        >
          {comments.sending ? <ActivityIndicator color={colors.onPrimary} /> : <SendIcon color={colors.onPrimary} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 4 },
  spinner: { paddingVertical: 24 },
  notice: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  empty: { textAlign: 'center', paddingVertical: 36 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 20, marginHorizontal: -20 },
  body: { flex: 1, gap: 3 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { fontWeight: '600', flexShrink: 1 },
  time: { flexShrink: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 4 },
  like: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 20 },
  link: { fontWeight: '600' },
  menu: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, marginLeft: -12 },
  replies: { marginLeft: 15, paddingLeft: 26, borderLeftWidth: 1.5 },
  moreReplies: { paddingVertical: 8 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingBottom: 8, gap: 6 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, borderRadius: 20, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  replyChip: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', maxWidth: '100%', paddingLeft: 12, paddingRight: 10, paddingVertical: 6, borderRadius: 999 },
  replyText: { fontWeight: '600', flexShrink: 1 },
});
