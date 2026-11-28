import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPostTime } from '../../lib/relativeTime';
import { radius, type, useColors } from '../../ui/theme';
import { AdPhoto } from './AdPhoto';
import { cardPrice, type Ad } from './ads';

// Карточка сетки 2×2: фото сверху (4:3), жирная цена, название в одну строку, серым место · время.
// Без рамок и теней; нет фото — плашка с иконкой.
export function AdCard({ ad, now, onPress }: { ad: Ad; now: Date; onPress: () => void }) {
  const colors = useColors();
  const price = cardPrice(ad);
  // У вакансии из формы вместо места — компания
  const meta = `${ad.jobDetails?.company ?? ad.district ?? 'Кампус'} · ${formatPostTime(new Date(ad.createdAt), now)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ad.title}. ${price}. ${meta}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.7 : 1 }]}
    >
      <AdPhoto ad={ad} style={styles.photo} iconScale={1.5} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={[type.headline, { color: colors.textPrimary }]}>
          {price}
        </Text>
        <Text numberOfLines={1} style={[type.subhead, { color: colors.textPrimary }]}>
          {ad.title}
        </Text>
        <Text numberOfLines={1} style={[type.footnote, { color: colors.muted }]}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 8 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.control, borderCurve: 'continuous' },
  text: { gap: 2 },
});
