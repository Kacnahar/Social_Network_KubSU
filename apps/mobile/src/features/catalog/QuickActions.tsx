import { useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { useSound } from '../../ui/soundStore';
import { type, useColors, useReduceMotion, useScheme } from '../../ui/theme';

const native = Platform.OS !== 'web';

export type QuickAction = { key: string; label: string; icon: (color: string) => ReactNode; onPress: () => void; dimmed?: boolean };

function Round({ action }: { action: QuickAction }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const sound = useSound();
  const light = useScheme() === 'light';
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (down: boolean) => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: down ? 0.9 : 1, speed: 50, bounciness: down ? 0 : 8, useNativeDriver: native }).start();
  };
  const press = () => {
    // Лёгкая вибрация: пока только на Android (для iPhone нужен пакет expo-haptics)
    if (Platform.OS === 'android' && sound.vibration) Vibration.vibrate(8);
    action.onPress();
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={press} onPressIn={() => animate(true)} onPressOut={() => animate(false)} style={styles.item}>
      <Animated.View style={[styles.circle, { backgroundColor: colors.fill, borderColor: colors.border, borderWidth: light ? 1 : 0, opacity: action.dimmed ? 0.45 : 1, transform: [{ scale }] }]}>{action.icon(colors.textPrimary)}</Animated.View>
      <Text numberOfLines={1} style={[type.footnote, styles.label, { color: colors.text, opacity: action.dimmed ? 0.45 : 1 }]}>
        {action.label}
      </Text>
    </Pressable>
  );
}

// Ряд быстрых действий: круглые кнопки по 56 px с тонкой иконкой и подписью, ровно по центру с одинаковыми промежутками
export function QuickActions({ actions }: { actions: readonly QuickAction[] }) {
  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <Round key={action.key} action={action} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  item: { alignItems: 'center', gap: 6, minWidth: 88 },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '500', textAlign: 'center' },
});
