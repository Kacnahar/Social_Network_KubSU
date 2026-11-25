import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BackButton } from './BackButton';
import { type, useColors } from './theme';

// Общая шапка экрана: слева «назад», по центру заголовок в одну строку, справа место 44 px или свой элемент.
// Высота всегда 52. Боковой отступ задаёт колонка экрана (20 px), сама шапка его не добавляет.
export function ScreenBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.bar}>
      <BackButton inline onPress={onBack} />
      <Text accessibilityRole="header" numberOfLines={1} style={[type.headline, styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {right ?? <View style={styles.space} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  title: { flex: 1, textAlign: 'center' },
  space: { width: 44, height: 44 },
});
