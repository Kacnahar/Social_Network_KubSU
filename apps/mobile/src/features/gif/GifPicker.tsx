import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchField } from '../../ui/SearchField';
import { radius, type, useColors } from '../../ui/theme';
import { fetchGifs, hasGiphy } from './giphy';
import { searchTestGifs, splitColumns, type Gif } from './gifs';

const COLUMNS = 2;
const GAP = 8;

// Окно выбора GIF: сверху поиск, ниже сетка в два столбца (сначала популярные, при вводе — результаты поиска),
// внизу мелко «Powered by GIPHY» (так требует GIPHY). Без ключа GIPHY показывает тестовые плитки.
export function GifPicker({ visible, onPick, onClose }: { visible: boolean; onPick: (gif: Gif) => void; onClose: () => void }) {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    if (!visible) {
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
  }, [visible, query]);

  const columns = splitColumns(gifs, COLUMNS);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.fill}>
          <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.bar}>
              <View style={styles.search}>
                <SearchField value={query} onChangeText={setQuery} placeholder="Поиск GIF" />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Закрыть" hitSlop={8} onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}>
                <Text style={[type.body, styles.cancel, { color: colors.textPrimary }]}>Отмена</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[type.footnote, { color: colors.textSecondary }]}>{query.trim() ? 'Результаты поиска' : hasGiphy ? 'Популярные' : 'Популярные (тестовые плитки: ключа GIPHY пока нет)'}</Text>
              {loading && gifs.length === 0 ? <ActivityIndicator color={colors.muted} style={styles.state} /> : null}
              {failed ? <Text style={[type.body, styles.state, { color: colors.muted }]}>Не получилось загрузить GIF. Проверьте интернет</Text> : null}
              {!loading && !failed && gifs.length === 0 ? <Text style={[type.body, styles.state, { color: colors.muted }]}>Ничего не нашлось. Попробуйте другие слова</Text> : null}
              <View style={styles.grid} onLayout={(event) => setGridWidth(Math.floor(event.nativeEvent.layout.width))}>
                {columns.map((column, index) => (
                  <View key={index} style={styles.column}>
                    {column.map((gif) => (
                      <GifTile key={gif.id} gif={gif} width={Math.max(0, Math.floor((gridWidth - GAP * (COLUMNS - 1)) / COLUMNS))} onPress={() => onPick(gif)} />
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>

            <Text style={[type.caption, styles.powered, { color: colors.textSecondary }]}>Powered by GIPHY</Text>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// Плитка GIF в сетке (и крупное превью в посте): картинка или, у тестовых, ровная плитка с названием
export function GifPreview({ gif, width }: { gif: Gif; width: number }) {
  const colors = useColors();
  const height = Math.round((width * gif.height) / gif.width);
  if (gif.previewUrl) return <Image source={{ uri: gif.previewUrl }} accessibilityLabel={`GIF: ${gif.title}`} style={{ width, height, borderRadius: radius.control, backgroundColor: colors.fill }} />;
  return (
    <View accessibilityLabel={`GIF: ${gif.title}`} style={[styles.test, { width, height, backgroundColor: colors.fill, borderColor: colors.border }]}>
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
  cancel: { fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 10 },
  grid: { flexDirection: 'row', gap: GAP },
  column: { flex: 1, gap: GAP },
  state: { textAlign: 'center', paddingVertical: 28 },
  powered: { textAlign: 'center', paddingVertical: 8 },
  test: { borderRadius: radius.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
