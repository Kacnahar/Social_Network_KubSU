import type { Story, StoryGroup } from '@app/shared';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaUrl } from '../../lib/api';
import { formatPostTime } from '../../lib/relativeTime';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { Avatar } from '../../ui/Avatar';
import { darkColors, type, useReduceMotion } from '../../ui/theme';
import { deleteStory, getStoryViewers, markStoryViewed } from './api';

// Просмотр фото всегда на тёмном фоне и в обеих темах: берём цвета тёмной темы
const VIEWER_BG = darkColors.background;
const VIEWER_TEXT = darkColors.text;
// Приглушённый текст, подложки и дорожки полосок — тоже из тёмной палитры
const VIEWER_MUTED = darkColors.muted;
const VIEWER_TRACK = darkColors.border;
const VIEWER_SCRIM = darkColors.scrim;
const VIEWER_PANEL = darkColors.surface;
const VIEWER_DANGER = darkColors.danger;

const STORY_MS = 5000;
const HOLD_MS = 300;

type Viewers = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: { id: string; name: string; avatarUrl: string | null; at: string }[] };

function TextButton({ title, onPress, color = VIEWER_TEXT }: { title: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Text style={[type.headline, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function StoryViewer({ group, onClose }: { group: StoryGroup; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const fail = useFail();
  const { token } = useSignedIn();
  const [stories, setStories] = useState<Story[]>(group.stories);
  const [index, setIndex] = useState(() => {
    const first = group.stories.findIndex((story) => !story.viewedByMe);
    return first === -1 ? 0 : first;
  });
  const [held, setHeld] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [viewers, setViewers] = useState<Viewers>({ status: 'loading' });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const progress = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(0);
  const pressedAt = useRef(0);
  const viewed = useRef(new Set<string>());

  const story = stories[index];
  const paused = held || showViewers || confirming;

  const go = useCallback(
    (to: number) => {
      progress.setValue(0);
      progressValue.current = 0;
      setShowViewers(false);
      setConfirming(false);
      setDeleteError(null);
      if (to < 0) return;
      if (to >= stories.length) onClose();
      else setIndex(to);
    },
    [progress, stories.length, onClose],
  );
  // Автопереход вызывает самую свежую версию, чтобы таймер не перезапускался на каждый рендер
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      progressValue.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  const storyId = story?.storyId;
  useEffect(() => {
    if (reduceMotion || paused || !storyId) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: (1 - progressValue.current) * STORY_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) goRef.current(index + 1);
    });
    return () => animation.stop();
  }, [progress, reduceMotion, paused, storyId, index]);

  // Свой просмотр не отмечаем, у остальных — один раз за открытие; ошибки не важны
  useEffect(() => {
    if (!storyId || group.isMine || viewed.current.has(storyId)) return;
    viewed.current.add(storyId);
    void markStoryViewed(token, storyId).catch(() => undefined);
  }, [storyId, group.isMine, token]);

  useEffect(() => {
    if (!showViewers || !storyId) return;
    let alive = true;
    setViewers({ status: 'loading' });
    getStoryViewers(token, storyId)
      .then((response) => {
        if (alive)
          setViewers({
            status: 'ready',
            items: response.viewers.map((entry) => ({ id: entry.viewer.profileId, name: entry.viewer.displayName, avatarUrl: entry.viewer.avatarUrl, at: entry.viewedAt })),
          });
      })
      .catch(async (caught: unknown) => {
        const message = await fail(caught);
        if (alive && message) setViewers({ status: 'error', message });
      });
    return () => {
      alive = false;
    };
  }, [showViewers, storyId, token, fail]);

  // Стрелки и Escape — только в браузере, где есть клавиатура
  useEffect(() => {
    if (typeof globalThis.addEventListener !== 'function' || typeof globalThis.document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goRef.current(index + 1);
      else if (event.key === 'ArrowLeft') goRef.current(Math.max(0, index - 1));
      else if (event.key === 'Escape') onClose();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [index, onClose]);

  const remove = async () => {
    if (!story) return;
    setDeleteError(null);
    try {
      await deleteStory(token, story.storyId);
      const rest = stories.filter((item) => item.storyId !== story.storyId);
      if (rest.length === 0) {
        onClose();
        return;
      }
      progress.setValue(0);
      progressValue.current = 0;
      setConfirming(false);
      setShowViewers(false);
      setStories(rest);
      setIndex(Math.min(index, rest.length - 1));
    } catch (caught) {
      setDeleteError(await fail(caught));
    }
  };

  const tap = (direction: 1 | -1) => {
    // Долгое удержание — это пауза, а не переход
    if (Date.now() - pressedAt.current > HOLD_MS) return;
    goRef.current(direction === 1 ? index + 1 : Math.max(0, index - 1));
  };
  const zoneProps = (direction: 1 | -1) => ({
    onPressIn: () => {
      pressedAt.current = Date.now();
      setHeld(true);
    },
    onPressOut: () => setHeld(false),
    onPress: () => tap(direction),
  });

  if (!story) return null;
  const uri = mediaUrl(story.photo.url);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {uri ? (
        <Image source={{ uri }} accessibilityLabel={story.caption || 'Фото истории'} style={StyleSheet.absoluteFill} resizeMode="contain" />
      ) : null}

      <View style={styles.zones}>
        <Pressable accessibilityRole="button" accessibilityLabel="Предыдущая история" style={styles.left} {...zoneProps(-1)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Следующая история" style={styles.right} {...zoneProps(1)} />
      </View>

      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.bars} pointerEvents="none">
          {stories.map((item, i) => (
            <View key={item.storyId} style={[styles.track, { backgroundColor: VIEWER_TRACK }]}>
              {i < index || (i === index && reduceMotion) ? (
                <View style={[styles.fill, { width: '100%', backgroundColor: VIEWER_TEXT }]} />
              ) : i === index ? (
                <Animated.View style={[styles.fill, { backgroundColor: VIEWER_TEXT, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.author}>
          <Avatar avatarUrl={group.author.avatarUrl} name={group.author.displayName} size={32} />
          <View style={styles.authorText}>
            <Text numberOfLines={1} style={[type.headline, { color: VIEWER_TEXT }]}>
              {group.author.displayName}
            </Text>
            <Text numberOfLines={1} style={[type.footnote, { color: VIEWER_MUTED }]}>
              {formatPostTime(new Date(story.createdAt), now)}
            </Text>
          </View>
          <TextButton title="Закрыть" onPress={onClose} />
        </View>
      </View>

      <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {story.caption ? (
          <View pointerEvents="none" style={[styles.caption, { backgroundColor: VIEWER_SCRIM }]}>
            <Text style={[type.body, { color: VIEWER_TEXT }]}>{story.caption}</Text>
          </View>
        ) : null}

        {group.isMine ? (
          <View style={[styles.panel, { backgroundColor: VIEWER_PANEL }]}>
            {showViewers ? (
              <ScrollView style={styles.viewers} contentContainerStyle={styles.viewersContent}>
                {viewers.status === 'loading' ? <Text style={[type.subhead, { color: VIEWER_MUTED }]}>Загружаем…</Text> : null}
                {viewers.status === 'error' ? <Text accessibilityRole="alert" style={[type.subhead, { color: VIEWER_DANGER }]}>{viewers.message}</Text> : null}
                {viewers.status === 'ready' && viewers.items.length === 0 ? <Text style={[type.subhead, { color: VIEWER_MUTED }]}>Пока никто не посмотрел</Text> : null}
                {viewers.status === 'ready'
                  ? viewers.items.map((item) => (
                      <View key={item.id} style={styles.viewer}>
                        <Avatar avatarUrl={item.avatarUrl} name={item.name} size={32} />
                        <Text numberOfLines={1} style={[type.body, styles.viewerName, { color: VIEWER_TEXT }]}>
                          {item.name}
                        </Text>
                        <Text style={[type.footnote, { color: VIEWER_MUTED }]}>{formatPostTime(new Date(item.at), now)}</Text>
                      </View>
                    ))
                  : null}
              </ScrollView>
            ) : null}
            {deleteError ? <Text accessibilityRole="alert" style={[type.subhead, { color: VIEWER_DANGER }]}>{deleteError}</Text> : null}
            {confirming ? (
              <View style={styles.actions}>
                <Text style={[type.headline, { color: VIEWER_TEXT }]}>Удалить историю?</Text>
                <View style={styles.buttons}>
                  <TextButton title="Отмена" onPress={() => setConfirming(false)} />
                  <TextButton title="Да, удалить" color={VIEWER_DANGER} onPress={() => void remove()} />
                </View>
              </View>
            ) : (
              <View style={styles.actions}>
                <TextButton
                  title={`Просмотры: ${story.viewCount ?? 0}`}
                  onPress={() => {
                    setConfirming(false);
                    setShowViewers((open) => !open);
                  }}
                />
                {story.canDelete ? (
                  <TextButton
                    title="Удалить"
                    color={VIEWER_DANGER}
                    onPress={() => {
                      setShowViewers(false);
                      setConfirming(true);
                    }}
                  />
                ) : null}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: VIEWER_BG },
  zones: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  left: { flex: 1 },
  right: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, gap: 10 },
  bars: { flexDirection: 'row', gap: 4 },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorText: { flex: 1 },
  textButton: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, gap: 10 },
  caption: { borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 10 },
  panel: { borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 4 },
  viewers: { maxHeight: 220 },
  viewersContent: { gap: 10, paddingVertical: 12 },
  viewer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewerName: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttons: { flexDirection: 'row', gap: 4 },
});
