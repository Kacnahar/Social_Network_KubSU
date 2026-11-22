import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, type, useColors } from './theme';

type ChipsProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  // null — ничего не выбрано
  value: T | null;
  // Повторное нажатие на выбранный чип снимает выбор, если allowNone
  onChange: (value: T | null) => void;
  allowNone?: boolean;
};

// Ряд чипов-переключателей: все в одну строку и одной ширины, выбранный залит акцентным цветом
export function Chips<T extends string>({ options, value, onChange, allowNone = true }: ChipsProps<T>) {
  const colors = useColors();
  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
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
              { backgroundColor: selected ? colors.accent : colors.fill, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text numberOfLines={1} style={[type.footnote, styles.label, { color: selected ? colors.onAccent : colors.text }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  label: { fontWeight: '600' },
});
