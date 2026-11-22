import { COMMENT_TEXT_MAX, can, type Comment } from '@app/shared';
import { useRouter } from 'expo-router';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Avatar } from '../../ui/Avatar';
import { Body, Button, Card, CardTitle, ErrorText, Field, Separator } from '../../ui/components';
import { type, useColors } from '../../ui/theme';
import { addComment, deleteComment, getComments, reportComment } from './api';
import { formatPostTime } from './postTime';
import { useFail } from './useFail';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; comments: Comment[]; nextCursor: string | null };

type CommentsCardProps = {
  postId: string;
  now: Date;
  // Комментарий добавлен (+1) или удалён (-1): счётчик живёт в посте
  onCountChange: (delta: number) => void;
};

export function CommentsCard({ postId, now, onCountChange }: CommentsCardProps) {
  const colors = useColors();
  const fail = useFail();
  const { token, account } = useSignedIn();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
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
    setSendError(null);
    setSending(true);
    try {
      const comment = await addComment(token, postId, draft.trim());
      setState((current) => (current.status === 'ready' ? { ...current, comments: [...current.comments, comment] } : current));
      setDraft('');
      onCountChange(1);
    } catch (caught) {
      setSendError(await fail(caught));
    } finally {
      setSending(false);
    }
  };

  const removed = (commentId: string) => {
    setState((current) =>
      current.status === 'ready'
        ? { ...current, comments: current.comments.filter((comment) => comment.commentId !== commentId) }
        : current,
    );
    onCountChange(-1);
  };

  return (
    <Card>
      <CardTitle>Комментарии</CardTitle>

      {state.status === 'loading' ? <ActivityIndicator color={colors.accent} /> : null}
      {state.status === 'error' ? (
        <>
          <ErrorText>{state.message}</ErrorText>
          <Button variant="secondary" title="Повторить" onPress={() => void load()} />
        </>
      ) : null}
      {state.status === 'ready' && state.comments.length === 0 ? <Body muted>Комментариев пока нет</Body> : null}
      {state.status === 'ready'
        ? state.comments.map((comment, index) => (
            <Fragment key={comment.commentId}>
              {index > 0 ? <Separator /> : null}
              <CommentRow comment={comment} now={now} onRemoved={removed} />
            </Fragment>
          ))
        : null}
      {state.status === 'ready' && state.nextCursor ? (
        <>
          <ErrorText>{moreError}</ErrorText>
          <Button variant="secondary" title="Показать ещё" onPress={() => void loadMore()} loading={loadingMore} />
        </>
      ) : null}

      {can(account.role, 'react') ? (
        <View style={styles.compose}>
          <Field
            label="Ваш комментарий"
            value={draft}
            onChangeText={setDraft}
            maxLength={COMMENT_TEXT_MAX}
            autoCapitalize="sentences"
            autoCorrect
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.draft}
            hint={`Осталось знаков: ${COMMENT_TEXT_MAX - draft.length}`}
          />
          <ErrorText>{sendError}</ErrorText>
          <Button title="Отправить" onPress={() => void send()} loading={sending} disabled={draft.trim() === ''} />
        </View>
      ) : null}
    </Card>
  );
}

function CommentRow({ comment, now, onRemoved }: { comment: Comment; now: Date; onRemoved: (commentId: string) => void }) {
  const router = useRouter();
  const colors = useColors();
  const fail = useFail();
  const { token, profile } = useSignedIn();
  const isMine = profile?.profileId === comment.author.profileId;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'delete' | 'report' | null>(null);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (caught) {
      setError(await fail(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.comment}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть профиль: ${comment.author.displayName}`}
        onPress={() => router.push(isMine ? '/profile' : `/profiles/${comment.author.profileId}`)}
        style={({ pressed }) => [styles.author, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Avatar avatarUrl={comment.author.avatarUrl} name={comment.author.displayName} size={32} />
        <View style={styles.authorText}>
          <Text numberOfLines={1} style={[type.subhead, styles.name, { color: colors.text }]}>
            {comment.author.displayName}
          </Text>
          <Text numberOfLines={1} style={[type.footnote, { color: colors.muted }]}>
            {formatPostTime(new Date(comment.createdAt), now)}
          </Text>
        </View>
      </Pressable>
      <Body>{comment.text}</Body>

      {confirming ? (
        <View style={styles.confirm}>
          <Body>Удалить комментарий?</Body>
          <Button variant="danger" title="Да, удалить" onPress={() => void remove()} loading={busy === 'delete'} />
          <Button variant="plain" title="Отмена" onPress={() => setConfirming(false)} disabled={busy !== null} />
        </View>
      ) : (
        <View style={styles.actions}>
          {comment.canDelete ? <Button variant="plainDanger" title="Удалить" onPress={() => setConfirming(true)} /> : null}
          {!isMine ? (
            reported ? (
              <Body muted>Спасибо, мы посмотрим</Body>
            ) : (
              <Button variant="plain" title="Пожаловаться" onPress={() => void report()} loading={busy === 'report'} />
            )
          ) : null}
        </View>
      )}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  comment: { gap: 6 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorText: { flex: 1 },
  name: { fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  confirm: { gap: 8 },
  compose: { gap: 10 },
  draft: { minHeight: 90 },
});
