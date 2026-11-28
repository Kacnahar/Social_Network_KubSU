import { can } from '@app/shared';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { BackButton } from '../../ui/BackButton';
import { Button, ListScreen, Title } from '../../ui/components';
import { SlidersIcon, SortIcon } from '../../ui/icons';
import { PlusButton } from '../../ui/PlusButton';
import { Popover, PopoverItem, useAnchor, type Rect } from '../../ui/Popover';
import { SearchField } from '../../ui/SearchField';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { AdCard } from './AdCard';
import { applyFilters, countActive, emptyFilters, filterCategoryOf, newAdCategoryOf, type AdFilters } from './adFilters';
import { AD_SORTS, DEFAULT_AD_SORT, sortAds, type Ad, type AdCategory, type AdSort } from './ads';
import { FilterSheet } from './FilterSheet';
import { useAds } from './store';

const GAP = 10;
// Пустая ячейка добивает нечётный ряд, чтобы последняя карточка не растягивалась на всю ширину
type Cell = Ad | { adId: string; empty: true };

// «Объявления» в Каталоге: шапка с «+», поиск, кнопка сортировки и кнопка «Фильтры» (окно FilterSheet), сетка 2×2
export function AdsScreen({ initialCategory }: { initialCategory: AdCategory | null }) {
  const router = useRouter();
  const colors = useColors();
  const { account } = useSignedIn();
  const ads = useAds();
  const sortAnchor = useAnchor();
  const reduceMotion = useReduceMotion();
  const fade = useRef(new Animated.Value(1)).current;
  const [sort, setSort] = useState<AdSort>(DEFAULT_AD_SORT);
  const [sortAt, setSortAt] = useState<Rect | null>(null);
  const [filters, setFilters] = useState<AdFilters>(() => ({ ...emptyFilters(), category: filterCategoryOf(initialCategory) }));
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [now] = useState(() => new Date());

  const activeCount = countActive(filters);
  const shown = sortAds(applyFilters(ads, filters, query), sort);
  const cells: Cell[] = shown.length % 2 === 1 ? [...shown, { adId: 'empty', empty: true }] : shown;
  // Порядок карточек меняется плавно: список на миг бледнеет и возвращается
  useEffect(() => {
    if (reduceMotion) return;
    fade.setValue(0.35);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [sort, filters, fade, reduceMotion]);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));
  const category = newAdCategoryOf(filters.category);

  const header = (
    <View style={styles.header}>
      <View style={styles.top}>
        <BackButton inline onPress={back} />
        <View style={styles.title}>
          <Title>Объявления</Title>
        </View>
        {/* Гость объявления только смотрит: кнопки добавления у него нет */}
        {can(account.role, 'publish') ? (
          <PlusButton label="Добавить объявление" onPress={() => router.push({ pathname: '/ad/new', params: category ? { category } : {} })} />
        ) : (
          <View style={styles.space} />
        )}
      </View>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Поиск по объявлениям" />
        </View>
        <View ref={sortAnchor.ref} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sort === DEFAULT_AD_SORT ? 'Сортировка' : 'Сортировка: изменена'}
            onPress={() => sortAnchor.measure(setSortAt)}
            style={({ pressed }) => [styles.filter, { opacity: pressed ? 0.4 : 1 }]}
          >
            <SortIcon color={colors.textPrimary} />
            {sort !== DEFAULT_AD_SORT ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={activeCount === 0 ? 'Фильтры' : `Фильтры: включено ${activeCount}`}
          onPress={() => setFilterOpen(true)}
          style={({ pressed }) => [styles.filter, { opacity: pressed ? 0.4 : 1 }]}
        >
          <SlidersIcon color={colors.textPrimary} />
          {activeCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[type.caption, { color: colors.onPrimary }]}>{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );

  return (
    <ListScreen>
      <Animated.View style={[styles.fill, { opacity: fade }]}>
      <FlatList
        data={cells}
        numColumns={2}
        key="grid"
        keyExtractor={(cell) => cell.adId}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) =>
          'empty' in item ? (
            <View style={styles.blank} />
          ) : (
            <AdCard ad={item} now={now} onPress={() => router.push({ pathname: '/ad/[adId]', params: { adId: item.adId } })} />
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted }]}>Ничего не найдено</Text>
            {activeCount > 0 ? (
              <View style={styles.resetButton}>
                <Button title="Сбросить фильтры" variant="secondary" size="compact" square onPress={() => setFilters(emptyFilters())} />
              </View>
            ) : null}
          </View>
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
      </Animated.View>
      <Popover visible={sortAt !== null} anchor={sortAt} onClose={() => setSortAt(null)}>
        <Text style={[type.footnote, styles.menuTitle, { color: colors.muted }]}>Сортировать</Text>
        {AD_SORTS.map((item) => (
          <PopoverItem
            key={item.value}
            title={item.label}
            selected={sort === item.value}
            onPress={() => {
              setSortAt(null);
              setSort(item.value);
            }}
          />
        ))}
      </Popover>
      <FilterSheet
        visible={filterOpen}
        filters={filters}
        ads={ads}
        query={query}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 28 },
  header: { gap: 12, marginBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  space: { width: 44, height: 44 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  search: { flex: 1, minWidth: 0 },
  filter: { minWidth: 44, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 4 },
  dot: { position: 'absolute', top: 8, right: 6, width: 7, height: 7, borderRadius: 4 },
  badge: { position: 'absolute', top: 6, right: 2, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  menuTitle: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  row: { gap: GAP, marginBottom: 18 },
  blank: { flex: 1 },
  emptyBox: { alignItems: 'center', gap: 16, paddingVertical: 40 },
  resetButton: { minWidth: 200 },
});
