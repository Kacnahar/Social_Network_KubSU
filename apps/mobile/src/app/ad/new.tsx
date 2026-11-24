import { can } from '@app/shared';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryTile } from '../../features/ads/CategoryTile';
import { BriefcaseGlyph, HomeGlyph, TagGlyph, ToolsGlyph } from '../../features/catalog/CatalogIcons';
import { useSignedIn } from '../../lib/session';
import { BackButton } from '../../ui/BackButton';
import { type, useColors } from '../../ui/theme';

const THICK = 2.2;

// Четыре категории нового объявления; у каждой свой экран формы
const CHOICES: readonly { key: 'sell' | 'rent' | 'services' | 'jobs'; title: string; caption: string; href: Href; icon: (color: string) => React.ReactNode }[] = [
  { key: 'sell', title: 'Продать вещь', caption: 'Техника, одежда, книги…', href: '/ad/new-sell', icon: (color) => <TagGlyph color={color} size={40} weight={THICK} /> },
  { key: 'rent', title: 'Сдать жильё', caption: 'Комната, квартира, подселение', href: '/ad/new-rent', icon: (color) => <HomeGlyph color={color} size={40} weight={THICK} /> },
  { key: 'services', title: 'Предложить услугу', caption: 'Репетиторство, ремонт, фото…', href: '/ad/new-service', icon: (color) => <ToolsGlyph color={color} size={40} weight={THICK} /> },
  { key: 'jobs', title: 'Разместить вакансию', caption: 'Работа и подработка', href: '/ad/new-job', icon: (color) => <BriefcaseGlyph color={color} size={40} weight={THICK} /> },
];

// «Новое объявление»: сначала выбор категории, потом её форма. Если категория уже известна (фильтр в «Объявлениях»,
// быстрая кнопка «Продать»), выбор пропускаем. Гостю экран недоступен
export default function NewAdChooser() {
  const router = useRouter();
  const colors = useColors();
  const { account } = useSignedIn();
  const params = useLocalSearchParams<{ category?: string }>();
  if (!can(account.role, 'publish')) return <Redirect href="/catalog" />;

  const known = CHOICES.find((item) => item.key === params.category);
  if (known) return <Redirect href={known.href} />;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.column}>
          <View style={styles.bar}>
            <BackButton inline onPress={back} />
            <Text accessibilityRole="header" numberOfLines={1} style={[type.headline, styles.barTitle, { color: colors.textPrimary }]}>
              Новое объявление
            </Text>
            <View style={styles.space} />
          </View>
          <Text style={[type.largeTitle, styles.heading, { color: colors.textPrimary }]}>Что хотите разместить?</Text>
          <View style={styles.grid}>
            {CHOICES.map((choice, index) => (
              <CategoryTile key={choice.key} index={index} title={choice.title} caption={choice.caption} icon={choice.icon} onPress={() => router.push(choice.href)} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20, gap: 16 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  barTitle: { flex: 1, textAlign: 'center' },
  space: { width: 44 },
  heading: { marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
