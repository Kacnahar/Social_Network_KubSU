import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useColors } from './theme';

// Круглая кнопка с иконкой в шапке экрана: «+», шестерёнка, «…», «назад»
export function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
