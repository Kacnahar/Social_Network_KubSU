import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '../../ui/BottomSheet';
import { SearchField } from '../../ui/SearchField';
import { radius, type, useColors, useReduceMotion, useScheme } from '../../ui/theme';
import { fetchGifs, hasGiphy } from './giphy';
import { searchTestGifs, splitColumns, type Gif } from './gifs';

const COLUMNS = 2;
const GAP = 8;

// Содержимое окна выбора GIF (общее для «Нового поста» и комментариев): поиск, сетка в два столбца
// (сначала популярные, при вводе — результаты поиска), внизу мелко «Powered by GIPHY».
// Без ключа GIPHY показывает тестовые плитки. headerRight — кнопка справа от поиска (например, «Отмена»)
export function GifBrowser({ active, onPick, headerRight }: { active: boolean; onPick: (gif: Gif) => void; headerRight?: ReactNode }) {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    if (!active) {
      setQuery('');
      return;
    }
    if (!hasGiphy) {
      setGifs(searchTestGifs(query));
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    // Запрос уходит с небольшой задержкой, чтобы не слать его на каждую букву
    const timer = setTimeout(async () => {
      try {
        setGifs(await fetchGifs(query, controller.signal));
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 350 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, query]);

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

      <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[type.footnote, { color: colors.textSecondary }]}>{query.trim() ? 'Результаты поиска' : 'Популярные'}</Text>
        {__DEV__ && !hasGiphy ? <Text style={[type.caption, { color: colors.muted }]}>Тестовые плитки: ключа GIPHY пока нет</Text> : null}
        {loading && gifs.length === 0 ? <ActivityIndicator color={colors.muted} style={styles.state} /> : null}
        {failed ? <Text style={[type.body, styles.state, { color: colors.muted }]}>Не получилось загрузить GIF. Проверьте интернет</Text> : null}
        {!loading && !failed && gifs.length === 0 ? <Text style={[type.body, styles.state, { color: colors.muted }]}>Ничего не нашлось. Попробуйте другие слова</Text> : null}
        <View style={styles.grid} onLayout={(event) => setGridWidth(Math.floor(event.nativeEvent.layout.width))}>
          {columns.map((column, index) => (
            <View key={index} style={styles.column}>
              {column.map((gif) => (
                <GifTile key={gif.id} gif={gif} width={tileWidth} onPress={() => onPick(gif)} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <Text style={[type.caption, styles.powered, { color: colors.textPrimary, opacity: 0.6 }]}>Powered by GIPHY</Text>
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
// onFill — когда превью лежит на фоне `fill` (например, внутри строки комментария): тогда плитка на `card`, чтобы её было видно
export function GifPreview({ gif, width, onFill = false }: { gif: Gif; width: number; onFill?: boolean }) {
  const colors = useColors();
  const scheme = useScheme();
  const height = Math.round((width * gif.height) / gif.width);
  if (gif.previewUrl) return <Image source={{ uri: gif.previewUrl }} accessibilityLabel={`GIF: ${gif.title}`} style={{ width, height, borderRadius: radius.control, backgroundColor: colors.fill }} />;
  return (
    <View accessibilityLabel={`GIF: ${gif.title}`} style={[styles.test, { width, height, backgroundColor: onFill ? colors.card : colors.fill, borderWidth: scheme === 'light' ? 1 : 0, borderColor: colors.border }]}>
      <Text style={[type.headline, { color: colors.textPrimary }]}>GIF</Text>
      <Text numberOfLines={1} style={[type.footnote, { color: colors.textSecondary }]}>
        {gif.title}
      </Text>
    </View>
  );
}

function GifTile({ gif, width, onPress }: { gif: Gif; width: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Выбрать GIF: ${gif.title}`} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
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
  powered: { textAlign: 'center', paddingVertical: 8 },
  test: { borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
