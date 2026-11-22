import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPostTime } from '../../lib/relativeTime';
import { radius, type, useColors } from '../../ui/theme';
import { AdPhoto } from './AdPhoto';
import { KIND_LABEL, SECTION_LABEL, formatAdPrice, type Ad } from './ads';

type AdRowProps = {
  ad: Ad;
  now: Date;
  onPress: () => void;
  // В результатах поиска по всему каталогу дописываем раздел
  showSection?: boolean;
};

// Строка списка: фото слева, справа название, цена, тип (или раздел) и время; снизу тонкая линия
export function AdRow({ ad, now, onPress, showSection = false }: AdRowProps) {
  const colors = useColors();
  const price = formatAdPrice(ad);
  const meta = [showSection ? SECTION_LABEL[ad.section] : null, ad.kind ? KIND_LABEL[ad.kind] : null, ad.district, formatPostTime(new Date(ad.createdAt), now)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ad.title}. ${price}. ${meta}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <AdPhoto ad={ad} style={styles.thumb} iconScale={1.3} />
      <View style={styles.text}>
        <Text numberOfLines={2} style={[type.body, { color: colors.text }]}>
          {ad.title}
        </Text>
        <Text style={[type.headline, { color: colors.text }]}>{price}</Text>
        <Text numberOfLines={1} style={[type.footnote, { color: colors.muted }]}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, paddingVertical: 14, paddingHorizontal: 20, marginHorizontal: -20, borderBottomWidth: StyleSheet.hairlineWidth },
  thumb: { width: 88, height: 88, borderRadius: radius.field, borderCurve: 'continuous' },
  text: { flex: 1, gap: 3, justifyContent: 'center' },
});
