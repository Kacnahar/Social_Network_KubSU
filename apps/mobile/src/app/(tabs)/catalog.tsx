import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AdRow } from '../../features/ads/AdItem';
import { filterAds, type Ad } from '../../features/ads/ads';
import { useAds } from '../../features/ads/store';
import { CATALOG_TILES, type CatalogTile } from '../../features/catalog/sections';
import { exampleWeek } from '../../features/catalog/scheduleExample';
import { Screen, Title } from '../../ui/components';
import { SearchField } from '../../ui/SearchField';
import { radius, type, useColors } from '../../ui/theme';

// Первая пара первого дня с занятиями (пример для группы ИТ-21), показывается на плитке расписания
const firstLesson = exampleWeek('ИТ-21').find((day) => day.lessons.length > 0)?.lessons[0];
const scheduleExample = firstLesson
  ? `Ближайшая пара (пример): ${firstLesson.time} · ${firstLesson.subject} · ${firstLesson.room}`
  : null;

// Вкладка «Каталог»: поиск, широкая плитка расписания сверху и сетка 2×2 из остальных разделов. Есть у всех ролей.
// Когда в поиске что-то введено, вместо плиток — найденные объявления из всех разделов
export default function CatalogScreen() {
  const router = useRouter();
  const colors = useColors();
  const ads = useAds();
  const [query, setQuery] = useState('');
  const [now] = useState(() => new Date());
  const searching = query.trim() !== '';
  const found = searching ? filterAds(ads, null, null, query) : [];

  const open = (tile: CatalogTile) =>
    tile.key === 'schedule' ? router.push('/catalog/schedule') : router.push({ pathname: '/catalog/[section]', params: { section: tile.key } });
  const openAd = (ad: Ad) => router.push({ pathname: '/ad/[adId]', params: { adId: ad.adId } });

  // Расписание — отдельной широкой плиткой; остальные четыре — сеткой 2×2 (две строки по две)
  const scheduleTile = CATALOG_TILES.find((tile) => tile.key === 'schedule');
  const gridTiles = CATALOG_TILES.filter((tile) => tile.key !== 'schedule');
  const rows: CatalogTile[][] = [];
  for (let index = 0; index < gridTiles.length; index += 2) rows.push(gridTiles.slice(index, index + 2));

  return (
    <Screen align="top">
      <Title>Каталог</Title>
      <SearchField value={query} onChangeText={setQuery} placeholder="Поиск по каталогу" />

      {searching ? (
        found.length > 0 ? (
          <View>
            {found.map((ad) => (
              <AdRow key={ad.adId} ad={ad} now={now} showSection onPress={() => openAd(ad)} />
            ))}
          </View>
        ) : (
          <Text style={[type.body, styles.empty, { color: colors.muted }]}>Ничего не нашлось. Попробуйте другие слова</Text>
        )
      ) : (
        <View style={styles.tiles}>
          {scheduleTile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${scheduleTile.label}. ${scheduleTile.caption}${scheduleExample ? `. ${scheduleExample}` : ''}`}
              onPress={() => open(scheduleTile)}
              style={({ pressed }) => [styles.wideTile, { backgroundColor: colors.fill, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.icon, { backgroundColor: colors.card }]}>{scheduleTile.icon(colors.accent)}</View>
              <View style={styles.tileText}>
                <Text style={[type.headline, { color: colors.text }]}>{scheduleTile.label}</Text>
                <Text numberOfLines={2} style={[type.footnote, { color: colors.muted }]}>
                  {scheduleExample ?? scheduleTile.caption}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {rows.map((row, index) => (
            <View key={index} style={styles.tileRow}>
              {row.map((tile) => (
                <Pressable
                  key={tile.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${tile.label}. ${tile.caption}`}
                  onPress={() => open(tile)}
                  style={({ pressed }) => [styles.tile, { backgroundColor: colors.fill, opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.icon, { backgroundColor: colors.card }]}>{tile.icon(colors.accent)}</View>
                  <View style={styles.tileText}>
                    <Text style={[type.headline, { color: colors.text }]}>{tile.label}</Text>
                    <Text numberOfLines={2} style={[type.footnote, { color: colors.muted }]}>
                      {tile.caption}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { gap: 12 },
  tileRow: { flexDirection: 'row', gap: 12 },
  wideTile: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, borderCurve: 'continuous', padding: 16 },
  tile: { flex: 1, minHeight: 148, borderRadius: radius.card, borderCurve: 'continuous', padding: 16, justifyContent: 'space-between', gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tileText: { flex: 1, gap: 3 },
  empty: { textAlign: 'center', paddingVertical: 36 },
});
