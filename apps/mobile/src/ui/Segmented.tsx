import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, type, useColors } from './theme';

type SegmentedProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// Переключатель в стиле Apple: «таблетки» в общей тонированной капсуле, выбранная — сплошная
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const colors = useColors();
  return (
    <View accessibilityRole="tablist" style={[styles.capsule, { backgroundColor: colors.fill }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.pill, selected && { backgroundColor: colors.card }, { opacity: pressed && !selected ? 0.6 : 1 }]}
          >
            <Text style={[type.headline, { color: selected ? colors.text : colors.muted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, gap: 4 },
  pill: { flex: 1, minHeight: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
