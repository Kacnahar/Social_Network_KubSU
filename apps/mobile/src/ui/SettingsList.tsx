import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRightIcon } from './icons';
import { type, useColors } from './theme';

type RowProps = {
  title: string;
  // Серым справа от названия: текущее значение
  value?: string;
  icon: ReactNode;
  onPress: () => void;
};

// Строка списка настроек: тонкая иконка слева, название, стрелка справа
export function SettingsRow({ title, value, icon, onPress }: RowProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}: ${value}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={styles.icon}>{icon}</View>
      <Text numberOfLines={2} style={[type.body, styles.title, { color: colors.text }]}>
        {title}
      </Text>
      {value ? (
        <Text numberOfLines={1} style={[type.subhead, styles.value, { color: colors.muted }]}>
          {value}
        </Text>
      ) : null}
      <ChevronRightIcon color={colors.muted} />
    </Pressable>
  );
}

// Группа строк: между группами — воздух, внутри — тонкие разделители
export function SettingsGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: { marginHorizontal: -20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 24, alignItems: 'center' },
  title: { flex: 1 },
  value: { maxWidth: '40%' },
});
