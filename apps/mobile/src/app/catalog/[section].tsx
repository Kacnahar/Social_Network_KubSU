import { can } from '@app/shared';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { AdsScreen } from '../../features/ads/AdsScreen';
import { AdRow } from '../../features/ads/AdItem';
import { AD_CATEGORIES, AD_SECTIONS, filterAds, filterByCategory, isCategory, isSection, kindOptions, type Ad, type AdCategory, type AdKind, type AdSection } from '../../features/ads/ads';
import { useAds } from '../../features/ads/store';
import { useSignedIn } from '../../lib/session';
import { Chips } from '../../ui/Chips';
import { ListScreen, Title } from '../../ui/components';
import { BackButton } from '../../ui/BackButton';
import { IconButton } from '../../ui/IconButton';
import { PlusButton } from '../../ui/PlusButton';
import { SearchField } from '../../ui/SearchField';
import { type, useColors } from '../../ui/theme';

// Раздел каталога («Объявления» с категориями Купить, Продать, Аренда жилья, Услуги, Вакансии): «назад» и «+», заголовок, поиск, чипы типов и список
export default function SectionScreen() {
  const params = useLocalSearchParams<{ section?: string; category?: string }>();
  if (!isSection(params.section)) return <Redirect href="/catalog" />;
  // «Объявления» — сетка 2×2 с фильтром; остальные разделы (книги и т. д.) остаются списком
  if (params.section === 'ads') return <AdsScreen initialCategory={isCategory(params.category) ? params.category : null} />;
  return <ListSection section={params.section} category={params.category} />;
}

function ListSection({ section, category: initialCategory }: { section: AdSection; category?: string }) {
  const router = useRouter();
  const colors = useColors();
  const { account } = useSignedIn();
  const ads = useAds();
  const [kind, setKind] = useState<AdKind | null>(null);
  const [category, setCategory] = useState<AdCategory | null>(isCategory(initialCategory) ? initialCategory : null);
  const [query, setQuery] = useState('');
  const [now] = useState(() => new Date());

  const meta = AD_SECTIONS.find((item) => item.value === section);
  const kinds = kindOptions(section);
  // «Объявления» собирают в себе услуги и вакансии: пять категорий-чипов, одна лента
  const merged = section === 'ads';
  const shown = merged ? filterByCategory(ads, category, query) : filterAds(ads, section, kind, query);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));
  const open = (ad: Ad) => router.push({ pathname: '/ad/[adId]', params: { adId: ad.adId } });

  const header = (
    <View style={styles.header}>
      <View style={styles.top}>
        <BackButton inline onPress={back} />
        {/* Гость объявления только смотрит: кнопки добавления у него нет */}
        {can(account.role, 'publish') ? (
          <PlusButton label="Добавить объявление" onPress={() => router.push({ pathname: '/ad/new', params: merged && category && category !== 'buy' ? { category } : {} })} />
        ) : (
          <View style={styles.space} />
        )}
      </View>
      <Title>{meta?.label ?? 'Каталог'}</Title>
      <SearchField value={query} onChangeText={setQuery} placeholder="Поиск" />
      {merged ? (
        <Chips scroll options={AD_CATEGORIES.map(({ value, label }) => ({ value, label }))} value={category} onChange={(value) => setCategory(isCategory(value) ? value : null)} />
      ) : kinds.length > 0 ? (
        <Chips options={kinds} value={kind} onChange={setKind} />
      ) : null}
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
  );

  return (
    <ListScreen>
      <FlatList
        data={shown}
        keyExtractor={(ad) => ad.adId}
        renderItem={({ item }) => <AdRow ad={item} now={now} onPress={() => open(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={[type.body, styles.empty, { color: colors.muted }]}>
            {query.trim() ? 'Ничего не нашлось. Попробуйте другие слова' : 'Здесь пока пусто'}
          </Text>
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 28 },
  header: { gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  space: { width: 40, height: 40 },
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: -20 },
  empty: { textAlign: 'center', paddingVertical: 40 },
});
