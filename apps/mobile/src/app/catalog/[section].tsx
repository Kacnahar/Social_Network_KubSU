import { can } from '@app/shared';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { AdRow } from '../../features/ads/AdItem';
import { AD_SECTIONS, filterAds, isSection, kindOptions, type Ad, type AdKind } from '../../features/ads/ads';
import { useAds } from '../../features/ads/store';
import { useSignedIn } from '../../lib/session';
import { Chips } from '../../ui/Chips';
import { ListScreen, Title } from '../../ui/components';
import { IconButton } from '../../ui/IconButton';
import { PlusIcon } from '../../ui/icons';
import { SearchField } from '../../ui/SearchField';
import { type, useColors } from '../../ui/theme';

// Раздел каталога (Объявления, Книги, Услуги, Вакансии): «назад» и «+», заголовок, поиск, чипы типов и список
export default function SectionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { account } = useSignedIn();
  const params = useLocalSearchParams<{ section?: string }>();
  const ads = useAds();
  const [kind, setKind] = useState<AdKind | null>(null);
  const [query, setQuery] = useState('');
  const [now] = useState(() => new Date());

  if (!isSection(params.section)) return <Redirect href="/catalog" />;
  const section = params.section;
  const meta = AD_SECTIONS.find((item) => item.value === section);
  const kinds = kindOptions(section);
  const shown = filterAds(ads, section, kind, query);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));
  const open = (ad: Ad) => router.push({ pathname: '/ad/[adId]', params: { adId: ad.adId } });

  const header = (
    <View style={styles.header}>
      <View style={styles.top}>
        <IconButton label="Назад" onPress={back}>
          <View style={[styles.chevron, { borderColor: colors.text }]} />
        </IconButton>
        {/* Гость объявления только смотрит: кнопки добавления у него нет */}
        {can(account.role, 'publish') ? (
          <IconButton label="Добавить объявление" onPress={() => router.push({ pathname: '/ad/new', params: { section } })}>
            <PlusIcon color={colors.accent} />
          </IconButton>
        ) : (
          <View style={styles.space} />
        )}
      </View>
      <Title>{meta?.label ?? 'Каталог'}</Title>
      <SearchField value={query} onChangeText={setQuery} placeholder="Поиск" />
      {kinds.length > 0 ? <Chips options={kinds} value={kind} onChange={setKind} /> : null}
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
  chevron: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }], marginLeft: 4 },
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: -20 },
  empty: { textAlign: 'center', paddingVertical: 40 },
});
