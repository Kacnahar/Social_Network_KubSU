import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type, useColors } from './theme';

type UnderlineTabsProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// Вкладки внутри экрана: текст в ряд, выбранная подчёркнута акцентной линией; под рядом тонкая линия на всю ширину
export function UnderlineTabs<T extends string>({ options, value, onChange }: UnderlineTabsProps<T>) {
  const colors = useColors();
  return (
    <View accessibilityRole="tablist" style={[styles.row, { borderBottomColor: colors.border }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.tab, { opacity: pressed && !selected ? 0.6 : 1 }]}
          >
            <Text style={[type.headline, { color: selected ? colors.text : colors.muted }]}>{option.label}</Text>
            <View style={[styles.line, { backgroundColor: selected ? colors.accent : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginHorizontal: -20, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, gap: 10 },
  line: { height: 2, width: '60%', borderRadius: 1 },
});
