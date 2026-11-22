import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from './components';
import { type, useColors } from './theme';

// Экран-заглушка для раздела, которого ещё нет: крупная иконка, название и «Скоро»
export function ComingSoon({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  const colors = useColors();
  return (
    <Screen>
      <View style={styles.center}>
        <View style={[styles.badge, { backgroundColor: colors.accentTint }]}>
          <View style={styles.icon}>{icon}</View>
        </View>
        <Text accessibilityRole="header" style={[type.largeTitle, styles.text, { color: colors.text }]}>
          {title}
        </Text>
        <View style={[styles.pill, { backgroundColor: colors.highlightTint }]}>
          <Text style={[type.subhead, styles.pillText, { color: colors.live }]}>Скоро</Text>
        </View>
        <Text style={[type.body, styles.text, { color: colors.muted }]}>{text}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 14 },
  badge: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  icon: { transform: [{ scale: 2.2 }] },
  text: { textAlign: 'center' },
  pill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontWeight: '600' },
});
