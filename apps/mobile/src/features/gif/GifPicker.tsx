import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '../../ui/BottomSheet';
import { SearchField } from '../../ui/SearchField';
import { radius, type, useColors, useReduceMotion, useScheme } from '../../ui/theme';
import { ApiError } from '../../lib/api';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { fetchGifs } from './api';
import { appendGifs, searchTestGifs, splitColumns, type Gif } from './gifs';

const COLUMNS = 2;
const GAP = 8;
const SEARCH_DELAY_MS = 300;
// За сколько точек до конца списка начинать подгрузку
const LOAD_MORE_BEFORE_END = 600;
const POST_GIF_MAX = 280;
const OFFLINE_TEXT = 'Нет соединения. Проверьте интернет';

// Содержимое окна выбора GIF (общее для «Нового поста» и комментариев): поиск, сетка в два столбца
// (сначала популярные, при вводе — результаты поиска), при прокрутке вниз подгружаются следующие, внизу мелко «Powered by GIFS.RU».
// GIF приходят с нашего сервера. Если на сервере нет ключа gifs.ru, при разработке показываются тестовые плитки.
// headerRight — кнопка справа от поиска (например, «Отмена»)
export function GifBrowser({ active, onPick, headerRight }: { active: boolean; onPick: (gif: Gif) => void; headerRight?: ReactNode }) {
  const colors = useColors();
  const fail = useFail();
  const { token } = useSignedIn();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Текст ошибки первой загрузки: «нет соединения» или «GIF недоступны»
  const [problem, setProblem] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [testTiles, setTestTiles] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);
  // Номер текущего запроса: ответы на устаревшие запросы (другие слова поиска) отбрасываются
  const generation = useRef(0);

  useEffect(() => {
    if (!active) {
      setQuery('');
      return;
    }
    const mine = ++generation.current;
    setLoading(true);
    setProblem(null);
    setMoreFailed(false);
    setLoadingMore(false);
    // Запрос уходит с небольшой задержкой, чтобы не слать его на каждую букву
    const timer = setTimeout(async () => {
      try {
        const page = await fetchGifs(token, query);
        if (generation.current !== mine) return;
        setTestTiles(false);
        setGifs(page.gifs);
        setNext(page.next);
      } catch (caught) {
        if (generation.current !== mine) return;
        if (__DEV__ && caught instanceof ApiError && (caught.code === 'gifs_unavailable' || caught.code === 'not_found')) {
          // На сервере разработки нет ключа GIF (или запущен старый сервер без GIF) — показываем тестовые плитки
          setTestTiles(true);
          setGifs(searchTestGifs(query));
          setNext(null);
        } else {
          setGifs([]);
          setNext(null);
          setProblem(caught instanceof ApiError && caught.code === 'network_error' ? OFFLINE_TEXT : ((await fail(caught)) ?? OFFLINE_TEXT));
        }
      } finally {
        if (generation.current === mine) setLoading(false);
      }
    }, query.trim() ? SEARCH_DELAY_MS : 0);
    return () => {
      clearTimeout(timer);
      generation.current += 1;
    };
  }, [active, query, token, fail]);

  // Следующая порция — когда список докрутили почти до конца
  const loadMore = async () => {
    if (next === null || loading || loadingMore) return;
    const mine = generation.current;
    setMoreFailed(false);
    setLoadingMore(true);
    try {
      const page = await fetchGifs(token, query, next);
      if (generation.current !== mine) return;
      setGifs((current) => appendGifs(current, page.gifs));
      setNext(page.next);
    } catch {
      if (generation.current === mine) setMoreFailed(true);
    } finally {
      if (generation.current === mine) setLoadingMore(false);
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (!moreFailed && contentOffset.y + layoutMeasurement.height >= contentSize.height - LOAD_MORE_BEFORE_END) void loadMore();
  };

  const columns = splitColumns(gifs, COLUMNS);
  const tileWidth = Math.max(0, Math.floor((gridWidth - GAP * (COLUMNS - 1)) / COLUMNS));

  return (
    <View style={styles.fill}>
      <View style={styles.bar}>
        <View style={styles.search}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Поиск GIF" />
        </View>
        {headerRight}
      </View>

      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={100}
      >
        <Text style={[type.footnote, { color: colors.textSecondary }]}>{query.trim() ? 'Результаты поиска' : 'Популярные'}</Text>
        {__DEV__ && testTiles ? <Text style={[type.caption, { color: colors.muted }]}>Тестовые плитки: на сервере пока нет ключа gifs.ru</Text> : null}
        {loading && gifs.length === 0 ? <ActivityIndicator accessibilityLabel="Загрузка" color={colors.muted} style={styles.state} /> : null}
        {problem ? <Text style={[type.body, styles.state, { color: colors.muted }]}>{problem}</Text> : null}
        {!loading && !problem && gifs.length === 0 ? <Text style={[type.body, styles.state, { color: colors.muted }]}>Ничего не найдено. Попробуйте другие слова</Text> : null}
        <View style={styles.grid} onLayout={(event) => setGridWidth(Math.floor(event.nativeEvent.layout.width))}>
          {columns.map((column, index) => (
            <View key={index} style={styles.column}>
              {column.map((gif) => (
                <GifTile key={gif.id} gif={gif} width={tileWidth} onPress={() => onPick(gif)} />
              ))}
            </View>
          ))}
        </View>
        {loadingMore ? <ActivityIndicator accessibilityLabel="Загрузка" color={colors.muted} style={styles.more} /> : null}
        {moreFailed ? (
          <Pressable accessibilityRole="button" onPress={() => void loadMore()} style={({ pressed }) => [styles.more, { opacity: pressed ? 0.5 : 1 }]}>
            <Text style={[type.footnote, styles.moreText, { color: colors.muted }]}>Не получилось загрузить ещё. Нажмите, чтобы повторить</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Text style={[type.caption, styles.powered, { color: colors.textPrimary, opacity: 0.6 }]}>Powered by GIFS.RU</Text>
    </View>
  );
}

// Окно на весь экран («Новый пост»)
export function GifPicker({ visible, onPick, onClose }: { visible: boolean; onPick: (gif: Gif) => void; onClose: () => void }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  return (
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.fill}>
          <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <GifBrowser
              active={visible}
              onPick={onPick}
              headerRight={
                <Pressable accessibilityRole="button" accessibilityLabel="Закрыть" onPress={onClose} style={({ pressed }) => [styles.cancelHit, { opacity: pressed ? 0.4 : 1 }]}>
                  <Text style={[type.body, styles.cancel, { color: colors.textPrimary }]}>Отмена</Text>
                </Pressable>
              }
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// Окно снизу на полэкрана («Отправить GIF» в комментариях): общий `BottomSheet` с ручкой и заголовком; закрывается свайпом вниз
// или нажатием на затемнённый фон; потянув вверх, окно раскрывается выше
export function GifSheet({ visible, title = 'Отправить GIF', onPick, onClose }: { visible: boolean; title?: string; onPick: (gif: Gif) => void; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} title={title} expandable onClose={onClose}>
      <GifBrowser active={visible} onPick={onPick} />
    </BottomSheet>
  );
}

// Плитка GIF в сетке (и крупное превью в посте): картинка или, у тестовых, ровная плитка с названием
// full — показывать полную версию (в посте), иначе маленькое превью (сетка, комментарий)
// onFill — когда превью лежит на фоне `fill` (например, внутри строки комментария): тогда плитка на `card`, чтобы её было видно
export function GifPreview({ gif, width, onFill = false, full = false }: { gif: Gif; width: number; onFill?: boolean; full?: boolean }) {
  const colors = useColors();
  const scheme = useScheme();
  const height = Math.round((width * gif.height) / gif.width);
  const label = gif.title ? `GIF: ${gif.title}` : 'GIF';
  const uri = full ? (gif.url ?? gif.previewUrl) : gif.previewUrl;
  if (uri) return <Image source={{ uri }} accessibilityLabel={label} style={{ width, height, borderRadius: radius.control, backgroundColor: colors.fill }} />;
  return (
    <View accessibilityLabel={label} style={[styles.test, { width, height, backgroundColor: onFill ? colors.card : colors.fill, borderWidth: scheme === 'light' ? 1 : 0, borderColor: colors.border }]}>
      <Text style={[type.headline, { color: colors.textPrimary }]}>GIF</Text>
      <Text numberOfLines={1} style={[type.footnote, { color: colors.textSecondary }]}>
        {gif.title}
      </Text>
    </View>
  );
}

// GIF в посте: во всю ширину, но не шире POST_GIF_MAX, с родными пропорциями
export function PostGif({ gif }: { gif: Gif }) {
  const [width, setWidth] = useState(0);
  return (
    <View onLayout={(event) => setWidth(Math.floor(event.nativeEvent.layout.width))}>
      {width > 0 ? <GifPreview gif={gif} width={Math.min(width, POST_GIF_MAX)} full /> : null}
    </View>
  );
}

function GifTile({ gif, width, onPress }: { gif: Gif; width: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={gif.title ? `Выбрать GIF: ${gif.title}` : 'Выбрать GIF'} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <GifPreview gif={gif} width={width} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  search: { flex: 1 },
  cancelHit: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  cancel: { fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 10 },
  grid: { flexDirection: 'row', gap: GAP },
  column: { flex: 1, gap: GAP },
  state: { textAlign: 'center', paddingVertical: 28 },
  more: { paddingVertical: 12 },
  moreText: { textAlign: 'center' },
  powered: { textAlign: 'center', paddingVertical: 8 },
  test: { borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
