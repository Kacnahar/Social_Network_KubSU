import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { radius, type, useColors } from './theme';

type ChipsProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  // null — ничего не выбрано
  value: T | null;
  // Повторное нажатие на выбранный чип снимает выбор, если allowNone
  onChange: (value: T | null) => void;
  allowNone?: boolean;
  // Чипы разной ширины в одну строку, которую можно листать (когда они не помещаются)
  scroll?: boolean;
};

// Ряд чипов-переключателей: все в одну строку и одной ширины, выбранный залит акцентным цветом
export function Chips<T extends string>({ options, value, onChange, allowNone = true, scroll = false }: ChipsProps<T>) {
  const colors = useColors();
  const items = (
    <>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(selected && allowNone ? null : option.value)}
            style={({ pressed }) => [
              styles.chip,
              scroll && styles.chipScroll,
              { backgroundColor: selected ? colors.primary : colors.fill, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text numberOfLines={1} style={[type.footnote, styles.label, { color: selected ? colors.onPrimary : colors.text }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </>
  );
  if (scroll) {
    return (
      <ScrollView accessibilityRole="radiogroup" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow} style={styles.scroller}>
        {items}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipScroll: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: 14 },
  scrollRow: { gap: 6, paddingRight: 20 },
  scroller: { flexGrow: 0, marginHorizontal: -20, paddingLeft: 20 },
  label: { fontWeight: '600' },
});
