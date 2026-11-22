import { can, type Comment, type Post } from '@app/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../lib/api';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, LoadingScreen, Screen, Title } from '../../ui/components';
import { getPost } from '../../features/posts/api';
import { CommentComposer, CommentList, useComments } from '../../features/posts/Comments';
import { PostCard } from '../../features/posts/PostCard';
import { IconButton } from '../../ui/IconButton';
import { type, useColors } from '../../ui/theme';

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; post: Post };

export default function PostScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [now] = useState(() => new Date());

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', post: await getPost(token, postId) });
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') await forgetSession();
      else if (caught instanceof ApiError && caught.code === 'not_found') setState({ status: 'missing' });
      else setState({ status: 'error', message: caught instanceof Error ? caught.message : 'Что-то пошло не так' });
    }
  }, [token, postId, forgetSession]);

  useEffect(() => {
    void load();
  }, [load]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const change = (post: Post) => setState({ status: 'ready', post });
  const countChanged = (delta: number) =>
    setState((current) =>
      current.status === 'ready'
        ? { status: 'ready', post: { ...current.post, commentCount: Math.max(0, current.post.commentCount + delta) } }
        : current,
    );

  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'ready') {
    return (
      <PostWithComments
        post={state.post}
        now={now}
        onBack={back}
        onChanged={change}
        // Удалённого поста больше нет
        onDeleted={() => setState({ status: 'missing' })}
        onCountChange={countChanged}
      />
    );
  }
  return (
    <Screen>
      <Title>{state.status === 'missing' ? 'Такого поста нет' : 'Не получилось загрузить'}</Title>
      {state.status === 'error' ? <Body muted>{state.message}</Body> : null}
      {state.status === 'error' ? <Button title="Попробовать ещё раз" onPress={() => void load()} /> : null}
      <Button variant={state.status === 'error' ? 'plain' : 'primary'} title="Назад" onPress={back} />
    </Screen>
  );
}

type PostWithCommentsProps = {
  post: Post;
  now: Date;
  onBack: () => void;
  onChanged: (post: Post) => void;
  onDeleted: () => void;
  onCountChange: (delta: number) => void;
};

// Пост сверху, под ним комментарии; поле ввода закреплено внизу и поднимается над клавиатурой
function PostWithComments({ post, now, onBack, onChanged, onDeleted, onCountChange }: PostWithCommentsProps) {
  const colors = useColors();
  const { account, signOut } = useGuestExit();
  const canReact = can(account.role, 'react');
  const comments = useComments(post.postId, onCountChange);
  const [focusKey, setFocusKey] = useState(0);

  const reply = (comment: Comment) => {
    comments.setReplyTo(comment);
    setFocusKey((key) => key + 1);
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.column, styles.bar]}>
            <IconButton label="Назад" onPress={onBack}>
              <View style={[styles.chevron, { borderColor: colors.text }]} />
            </IconButton>
            <Text accessibilityRole="header" style={[type.headline, { color: colors.text }]}>
              Пост
            </Text>
            <View style={styles.barSpace} />
          </View>

          <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.column}>
              <PostCard post={post} now={now} expanded onChanged={onChanged} onDeleted={onDeleted} />
              <CommentList comments={comments} now={now} canReact={canReact} onReply={reply} />
            </View>
          </ScrollView>

          <View style={styles.column}>
            {canReact ? (
              <CommentComposer comments={comments} focusKey={focusKey} />
            ) : (
              // Гость комментарии только читает
              <View style={[styles.guest, { borderTopColor: colors.border }]}>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={signOut} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                  <Text style={[type.subhead, styles.guestText, { color: colors.accent }]}>Зарегистрируйтесь, чтобы комментировать</Text>
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// Гостю кнопка регистрации завершает гостевой вход — откроется стартовый экран
function useGuestExit() {
  const { signOut } = useSession();
  const { account } = useSignedIn();
  return { account, signOut: () => void signOut() };
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  barSpace: { width: 40 },
  chevron: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }], marginLeft: 4 },
  scroll: { flexGrow: 1, paddingBottom: 16 },
  guest: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 16 },
  guestText: { textAlign: 'center', fontWeight: '600' },
});
