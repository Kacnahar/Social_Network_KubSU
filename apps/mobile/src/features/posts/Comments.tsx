import { COMMENT_TEXT_MAX, type Comment } from '@app/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GifPreview, GifSheet } from '../gif/GifPicker';
import type { Gif } from '../gif/gifs';
import { formatPostTime } from '../../lib/relativeTime';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { Avatar } from '../../ui/Avatar';
import { Button, ErrorText, noOutline } from '../../ui/components';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { CommentButton, LikeButton } from '../../ui/ActionButtons';
import { CloseIcon, DotsIcon, FlagIcon, GifIcon, SendIcon, TrashIcon } from '../../ui/icons';
import { useNickname } from '../../ui/nicknameStore';
import { Popover, PopoverItem, PopoverSeparator, useAnchor, type Rect } from '../../ui/Popover';
import { plural } from '../../ui/plural';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { GIF_PLACEHOLDER, rememberCommentGif, useCommentGif, visibleCommentText } from './commentGifs';
import { addComment, deleteComment, getComments, reportComment } from './api';
import { ancestorsOf, buildTree, isCommentLiked, likeCountOf, parentOfComment, rememberReply, toggleCommentLike, visibleReplies, type TreeNode } from './commentThreads';

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
  // Выбранный GIF (не больше одного) — только в памяти приложения, на сервер пока не уходит
  const [draftGif, setDraftGif] = useState<Gif | null>(null);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Последний добавленный ответ: список раскрывает его ветку и показывает ответ плавно
  const [lastAdded, setLastAdded] = useState<{ id: string; parentId: string | null } | null>(null);

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
    // Комментарий из одного GIF отправляется с текстом-заглушкой: сервер требует непустой текст
    const text = draft.trim() || (draftGif ? GIF_PLACEHOLDER : '');
    if (text === '' || sending) return;
    const gif = draftGif;
    setSendError(null);
    setSending(true);
    try {
      const comment = await addComment(token, postId, text);
      if (replyTo) rememberReply(comment.commentId, replyTo.commentId);
      if (gif) rememberCommentGif(comment.commentId, gif);
      setLastAdded({ id: comment.commentId, parentId: replyTo ? replyTo.commentId : null });
      setState((current) => (current.status === 'ready' ? { ...current, comments: [...current.comments, comment] } : current));
      setDraft('');
      setDraftGif(null);
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

  return { state, load, loadMore, loadingMore, moreError, draft, setDraft, draftGif, setDraftGif, replyTo, setReplyTo, send, sending, sendError, removed, lastAdded };
}

type CommentsApi = ReturnType<typeof useComments>;

// Размеры дерева: аватарка 32, сдвиг ответа на её ширину и промежуток, толщина линии-ветки 1,5
const AVATAR = 32;
const INDENT = AVATAR + 10;
const LINE = 1.5;
const ROW_PAD = 8;
// Поле комментария: одна строка = высота строки текста 23 + отступы по 4,5 = 32 (как аватарка); максимум 5 строк
const INPUT_PAD = 4.5;
const INPUT_MIN = 23 + INPUT_PAD * 2;
const INPUT_MAX = 23 * 5 + INPUT_PAD * 2;
const ELBOW_Y = ROW_PAD + AVATAR / 2; // на какой высоте ветка подходит к аватарке ответа
const LINE_X = AVATAR / 2 - LINE / 2; // где проходит вертикальная линия под аватаркой родителя

type CommentListProps = {
  comments: CommentsApi;
  now: Date;
  canReact: boolean;
  onReply: (comment: Comment) => void;
  // Номер профиля автора поста: у его комментариев значок «Автор»
  postAuthorId?: string;
};

export function CommentList({ comments, now, canReact, onReply, postAuthorId }: CommentListProps) {
  const colors = useColors();
  const { state } = comments;
  const tree = state.status === 'ready' ? buildTree(state.comments, parentOfComment) : [];

  // Раскрытые «Показать ещё» (по номеру комментария-родителя)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const expand = (ids: string[]) =>
    setExpanded((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });

  // Новый ответ: раскрываем ветку, чтобы он был виден
  const added = comments.lastAdded;
  useEffect(() => {
    if (added?.parentId) expand([added.parentId, ...ancestorsOf(added.parentId)]);
  }, [added]);

  // Что уже было на экране: всё новое появляется плавно
  const known = useRef<Set<string> | null>(null);
  const firstLoad = known.current === null;
  const ids = state.status === 'ready' ? state.comments.map((comment) => comment.commentId) : [];
  const knownNow = known.current;
  useEffect(() => {
    if (state.status !== 'ready') return;
    known.current = new Set(ids);
  });

  const shared = { now, canReact, onReply, postAuthorId, expanded, expand, isNew: (id: string) => !firstLoad && knownNow !== null && !knownNow.has(id), onRemoved: comments.removed };

  return (
    <View style={styles.list}>
      {state.status === 'loading' ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
      {state.status === 'error' ? (
        <View style={styles.notice}>
          <ErrorText>{state.message}</ErrorText>
          <Button variant="secondary" title="Повторить" onPress={() => void comments.load()} />
        </View>
      ) : null}
      {state.status === 'ready' && tree.length === 0 ? (
        <Text style={[type.body, styles.empty, { color: colors.muted }]}>
          Пока нет комментариев.{canReact ? ' Будьте первым' : ''}
        </Text>
      ) : null}

      {tree.map((node) => (
        <NodeView key={node.comment.commentId} node={node} sibling="root" {...shared} />
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

type Shared = {
  now: Date;
  canReact: boolean;
  onReply: (comment: Comment) => void;
  postAuthorId?: string;
  expanded: Set<string>;
  expand: (ids: string[]) => void;
  isNew: (commentId: string) => boolean;
  onRemoved: (commentId: string) => void;
};

// Появление: прозрачность и лёгкий сдвиг (при «Уменьшении движения» — сразу)
function Reveal({ animate, children }: { animate: boolean; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  const on = animate && !reduceMotion;
  const progress = useRef(new Animated.Value(on ? 0 : 1)).current;
  useEffect(() => {
    if (on) Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [on, progress]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>;
}

// Один комментарий и всё, что под ним. sibling: root — верхний уровень; last — последний ответ в ветке; more — не последний.
// У ответа рисуется «колено» ветки: линия от аватарки родителя загибается к аватарке ответа
function NodeView({ node, sibling, animate = false, ...shared }: { node: TreeNode; sibling: 'root' | 'last' | 'more'; animate?: boolean } & Shared) {
  const colors = useColors();
  const open = shared.expanded.has(node.comment.commentId);
  const { shown, hidden } = visibleReplies(node.children, open);
  const hasChildren = shown.length > 0;
  const nested = sibling !== 'root';
  const showMore = hidden > 0;

  return (
    <Reveal animate={animate || shared.isNew(node.comment.commentId)}>
      <View>
        {nested ? <View pointerEvents="none" style={[styles.elbow, { borderColor: colors.border }]} /> : null}
        {sibling === 'more' ? <View pointerEvents="none" style={[styles.through, { backgroundColor: colors.border }]} /> : null}
        <CommentRow node={node} lineBelow={hasChildren || showMore} {...shared} />
        {hasChildren || showMore ? (
          <View style={styles.children}>
            {shown.map((child, index) => (
              <NodeView
                key={child.comment.commentId}
                node={child}
                // Последний на экране: если ниже есть «Показать ещё», ветка продолжается до него
                sibling={index === shown.length - 1 && !showMore ? 'last' : 'more'}
                animate={open && index >= 2}
                {...shared}
              />
            ))}
            {showMore ? (
              <View>
                <View pointerEvents="none" style={[styles.elbow, { borderColor: colors.border }]} />
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => shared.expand([node.comment.commentId])} style={({ pressed }) => [styles.moreReplies, { opacity: pressed ? 0.6 : 1 }]}>
                  <Text style={[type.footnote, styles.link, { color: colors.muted }]}>
                    Показать ещё {hidden} {plural(hidden, 'ответ', 'ответа', 'ответов')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Reveal>
  );
}

// Имя для показа: никнейм, если он известен (пока только свой), иначе имя профиля
function useHandle(author: Comment['author']): string {
  const nickname = useNickname(author.profileId);
  return nickname ? nickname : author.displayName;
}

function MentionLine({ comment, mention }: { comment: Comment; mention: Comment | null }) {
  const colors = useColors();
  const mentionName = useHandle((mention ?? comment).author);
  const gif = useCommentGif(comment.commentId);
  const text = visibleCommentText(comment.text, gif);
  return (
    <View style={styles.mentionLine}>
      {text !== '' || mention ? (
        <Text style={[type.body, { color: colors.text }]}>
          {mention ? <Text style={{ color: colors.muted }}>@{mentionName} </Text> : null}
          {text}
        </Text>
      ) : null}
      {/* GIF под текстом комментария */}
      {gif ? (
        <View style={styles.commentGif}>
          <GifPreview gif={gif} width={140} />
        </View>
      ) : null}
    </View>
  );
}

function CommentRow({ node, lineBelow, now, canReact, onReply, onRemoved, postAuthorId }: { node: TreeNode; lineBelow: boolean } & Shared) {
  const { comment } = node;
  const router = useRouter();
  const colors = useColors();
  const fail = useFail();
  const { token, profile } = useSignedIn();
  const handle = useHandle(comment.author);
  const isMine = profile?.profileId === comment.author.profileId;
  const isPostAuthor = postAuthorId !== undefined && comment.author.profileId === postAuthorId;
  const [menu, setMenu] = useState<'closed' | 'open' | 'confirm'>('closed');
  const [menuAt, setMenuAt] = useState<Rect | null>(null);
  const anchor = useAnchor();
  const [busy, setBusy] = useState<'delete' | 'report' | null>(null);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(() => isCommentLiked(comment.commentId));
  const canReport = !isMine && canReact && !reported;
  const hasMenu = canReport || comment.canDelete;
  const likes = likeCountOf(comment.commentId);

  const remove = async () => {
    setError(null);
    setBusy('delete');
    try {
      await deleteComment(token, comment.commentId);
      onRemoved(comment.commentId);
    } catch (caught) {
      setError(await fail(caught));
    } finally {
      setBusy(null);
      setMenu('closed');
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

  const like = () => {
    toggleCommentLike(comment.commentId);
    setLiked(isCommentLiked(comment.commentId));
  };

  return (
    <View style={styles.row}>
      <View style={styles.avatarCol}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Открыть профиль: ${comment.author.displayName}`}
          onPress={() => router.push(isMine ? '/profile' : `/profiles/${comment.author.profileId}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Avatar avatarUrl={comment.author.avatarUrl} name={comment.author.displayName} size={AVATAR} />
        </Pressable>
        {/* Линия-ветка вниз от аватарки к ответам */}
        {lineBelow ? <View pointerEvents="none" style={[styles.stem, { backgroundColor: colors.border }]} /> : null}
      </View>

      <View style={styles.body}>
        <View style={styles.head}>
          <Text numberOfLines={1} style={[type.subhead, styles.name, { color: colors.text }]}>
            {handle}
          </Text>
          <Text numberOfLines={1} style={[type.footnote, styles.time, { color: colors.muted }]}>
            {formatPostTime(new Date(comment.createdAt), now)}
          </Text>
          {isPostAuthor ? (
            <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[type.caption, styles.badgeText, { color: colors.textPrimary }]}>Автор</Text>
            </View>
          ) : null}
          <View style={styles.flex} />
          {hasMenu ? (
            <Pressable
              ref={anchor.ref}
              accessibilityRole="button"
              accessibilityLabel={`Действия с комментарием: ${comment.author.displayName}`}
              onPress={() =>
                anchor.measure((rect) => {
                  setMenuAt(rect);
                  setMenu('open');
                })
              }
              style={({ pressed }) => [styles.kebab, { opacity: pressed ? 0.5 : 1 }]}
            >
              <DotsIcon color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <MentionLine comment={comment} mention={node.mentionOf} />

        <View style={styles.actions}>
          <LikeButton liked={liked} count={likes} onPress={canReact ? like : undefined} size={18} />
          <CommentButton
            count={node.children.length}
            size={18}
            label={`Ответить: ${comment.author.displayName}. Ответов: ${node.children.length}`}
            onPress={canReact ? () => onReply(comment) : undefined}
          />
        </View>

        {reported ? <Text style={[type.footnote, { color: colors.muted }]}>Спасибо, мы проверим</Text> : null}

        <Popover visible={menu === 'open'} anchor={menuAt} onClose={() => setMenu('closed')}>
          {canReport ? (
            <PopoverItem compact first title="Пожаловаться" icon={<FlagIcon color={colors.textPrimary} />} onPress={() => { setMenu('closed'); void report(); }} />
          ) : null}
          {comment.canDelete && canReport ? <PopoverSeparator /> : null}
          {comment.canDelete ? (
            <PopoverItem compact danger first={!canReport} title="Удалить" icon={<TrashIcon color={colors.danger} />} onPress={() => setMenu('confirm')} />
          ) : null}
        </Popover>
        <ConfirmDialog
          visible={menu === 'confirm'}
          title="Удалить комментарий?"
          message="Это действие нельзя отменить"
          confirmTitle="Удалить"
          danger
          loading={busy === 'delete'}
          onConfirm={() => void remove()}
          onCancel={() => setMenu('closed')}
        />
        <ErrorText>{error}</ErrorText>
      </View>
    </View>
  );
}

// Поле «Написать комментарий…», закреплённое внизу экрана: аватар, ввод и круглая кнопка отправки.
// При ответе над полем — плашка «Ответ для Имя ✕»
export function CommentComposer({ comments, focusKey }: { comments: CommentsApi; focusKey: number }) {
  const colors = useColors();
  const replyHandle = useNickname(comments.replyTo?.author.profileId);
  const { profile } = useSignedIn();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [pickingGif, setPickingGif] = useState(false);
  // Высота поля: одна строка по умолчанию, растёт ровно на строку, максимум 5 строк, дальше текст прокручивается внутри
  const reduceMotion = useReduceMotion();
  const [textH, setTextH] = useState(INPUT_MIN);
  const inputH = useRef(new Animated.Value(INPUT_MIN)).current;
  const placed = useRef(false);
  const targetH = Math.max(INPUT_MIN, Math.min(textH, INPUT_MAX));
  useEffect(() => {
    if (!placed.current || reduceMotion) {
      placed.current = true;
      inputH.setValue(targetH);
      return;
    }
    Animated.timing(inputH, { toValue: targetH, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [targetH, inputH, reduceMotion]);
  const canSend = (comments.draft.trim() !== '' || comments.draftGif !== null) && !comments.sending;

  // «Ответить» ставит курсор в поле
  useEffect(() => {
    if (focusKey > 0) input.current?.focus();
  }, [focusKey]);

  return (
    <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
      {comments.replyTo ? (
        <View style={[styles.replyChip, { backgroundColor: colors.accentTint }]}>
          <Text numberOfLines={1} style={[type.footnote, styles.replyText, { color: colors.accent }]}>
            Ответ для @{replyHandle ?? comments.replyTo.author.displayName}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Отменить ответ" hitSlop={10} onPress={() => comments.setReplyTo(null)}>
            <CloseIcon color={colors.accent} size={11} />
          </Pressable>
        </View>
      ) : null}
      <ErrorText>{comments.sendError}</ErrorText>
      {/* Всё в одном блоке: GIF (если выбран), а в ряду — аватарка, поле, GIF, «Отправить» */}
      <View style={[styles.composerBox, { backgroundColor: colors.fill }]}>
        {comments.draftGif ? (
          <View style={styles.draftGif}>
            <GifPreview gif={comments.draftGif} width={120} onFill />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Убрать GIF"
              hitSlop={11}
              onPress={() => comments.setDraftGif(null)}
              style={[styles.removeGif, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
            >
              <CloseIcon color={colors.text} size={10} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composerRow}>
          <Avatar avatarUrl={profile?.avatarUrl ?? null} name={profile?.displayName ?? ''} size={32} />
          <Animated.View style={[styles.inputWrap, { height: inputH }]}>
            <TextInput
              ref={input}
              accessibilityLabel="Написать комментарий"
              value={comments.draft}
              onChangeText={comments.setDraft}
              placeholder="Комментарий…"
              placeholderTextColor={colors.muted}
              selectionColor={colors.accent}
              maxLength={COMMENT_TEXT_MAX}
              autoCapitalize="sentences"
              autoCorrect
              multiline
              scrollEnabled={textH > INPUT_MAX}
              style={[type.body, styles.input, noOutline, { color: colors.text }]}
            />
            {/* Невидимая копия текста: по её высоте узнаём, сколько строк нужно */}
            <Text
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no"
              onLayout={(event) => setTextH(Math.ceil(event.nativeEvent.layout.height))}
              style={[type.body, styles.mirror]}
            >
              {`${comments.draft}\u200b`}
            </Text>
          </Animated.View>
          {/* Один GIF на комментарий: пока он выбран, кнопка бледная; чтобы заменить, сначала уберите прежний крестиком */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="GIF"
            disabled={comments.draftGif !== null}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            onPress={() => setPickingGif(true)}
            style={({ pressed }) => [styles.gifButton, { opacity: comments.draftGif !== null ? 0.3 : pressed ? 0.5 : 1 }]}
          >
            <GifIcon color={colors.textSecondary} />
          </Pressable>
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
      <GifSheet
        visible={pickingGif}
        onClose={() => setPickingGif(false)}
        onPick={(gif) => {
          comments.setDraftGif(gif);
          setPickingGif(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 4 },
  spinner: { paddingVertical: 24 },
  notice: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  empty: { textAlign: 'center', paddingVertical: 36 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: ROW_PAD },
  avatarCol: { width: AVATAR },
  // Линия вниз от аватарки к ответам
  stem: { position: 'absolute', left: LINE_X, top: AVATAR + 4, bottom: -ROW_PAD, width: LINE, borderRadius: 1 },
  body: { flex: 1, gap: 3, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 20 },
  name: { fontWeight: '700', flexShrink: 1 },
  time: { flexShrink: 0 },
  badge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, flexShrink: 0 },
  badgeText: { fontWeight: '600' },
  // Область нажатия «⋯» — 44×44, сам значок тонкий и серый
  kebab: { width: 44, height: 44, marginRight: -12, marginVertical: -12, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 24 },
  link: { fontWeight: '600' },
  // Ответы сдвинуты на ширину аватарки; у каждого — «колено» ветки от линии родителя
  children: { marginLeft: INDENT },
  elbow: { position: 'absolute', left: -INDENT + LINE_X, top: 0, width: INDENT - LINE_X - 6, height: ELBOW_Y, borderLeftWidth: LINE, borderBottomWidth: LINE, borderBottomLeftRadius: 14 },
  // Линия продолжается мимо ответа к следующему ответу той же ветки
  through: { position: 'absolute', left: -INDENT + LINE_X, top: ELBOW_Y, bottom: 0, width: LINE, borderRadius: 1 },
  moreReplies: { paddingVertical: 10, paddingLeft: 0, minHeight: 44, justifyContent: 'center' },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingBottom: 8, gap: 6 },
  // Один общий блок: фон, скругление 12 px; всё внутри выровнено по вертикальному центру аватарки
  composerBox: { borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 8, paddingVertical: 4, gap: 6 },
  // Аватарка, GIF и «Отправить» прижаты к нижней строке поля (как в Instagram и Telegram)
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  inputWrap: { flex: 1, overflow: 'hidden' },
  input: { flex: 1, paddingHorizontal: 6, paddingTop: INPUT_PAD, paddingBottom: INPUT_PAD, textAlignVertical: 'top' },
  mirror: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0, paddingHorizontal: 6, paddingTop: INPUT_PAD, paddingBottom: INPUT_PAD },
  gifButton: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center' },
  send: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  draftGif: { alignSelf: 'flex-start', paddingTop: 4, paddingLeft: 4 },
  removeGif: { position: 'absolute', right: -6, top: -2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  mentionLine: { gap: 6 },
  commentGif: { alignSelf: 'flex-start' },
  replyChip: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', maxWidth: '100%', paddingLeft: 12, paddingRight: 10, paddingVertical: 6, borderRadius: 999 },
  replyText: { fontWeight: '600', flexShrink: 1 },
});
