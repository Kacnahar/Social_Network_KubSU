import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './components';
import { type, useColors } from './theme';

type StepScreenProps = {
  title: string;
  subtitle?: string;
  // Тонкий индикатор сверху: какой шаг из скольких. Без него — одиночный экран (например, вход)
  step?: { current: number; total: number };
  onBack?: () => void;
  children: ReactNode;
  // Главное действие всегда внизу экрана, под большим пальцем
  primary: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean };
  // Второстепенные действия под главной кнопкой (текстовые)
  footer?: ReactNode;
};

// Экран одного шага: один вопрос, много воздуха, кнопка внизу. Учитывает вырез и нижнюю полосу iPhone
export function StepScreen({ title, subtitle, step, onBack, children, primary, footer }: StepScreenProps) {
  const colors = useColors();
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.column, styles.header]}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Назад"
                hitSlop={10}
                onPress={onBack}
                style={({ pressed }) => [styles.back, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={[styles.chevron, { borderColor: colors.text }]} />
              </Pressable>
            ) : null}
            {step ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={`Шаг ${step.current} из ${step.total}`}
                accessibilityValue={{ min: 1, max: step.total, now: step.current }}
                style={styles.progress}
              >
                {Array.from({ length: step.total }, (_, index) => (
                  <View
                    key={index}
                    style={[styles.segment, { backgroundColor: index < step.current ? colors.primary : colors.fill }]}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.column, styles.body]}>
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={[type.largeTitle, { color: colors.text }]}>
                  {title}
                </Text>
                {subtitle ? <Text style={[type.body, { color: colors.muted }]}>{subtitle}</Text> : null}
              </View>
              {children}
            </View>
          </ScrollView>

          <View style={[styles.column, styles.footer]}>
            <Button title={primary.title} onPress={primary.onPress} loading={primary.loading} disabled={primary.disabled} />
            {footer}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 56, paddingTop: 8 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // Стрелка «назад»: уголок из двух сторон рамки
  chevron: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }], marginLeft: 4 },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  scroll: { flexGrow: 1 },
  body: { paddingTop: 28, paddingBottom: 24, gap: 28 },
  heading: { gap: 10 },
  footer: { paddingTop: 8, paddingBottom: 12, gap: 4 },
});
