import type { ComponentRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DotsIcon } from './icons';
import { useColors } from './theme';

// Кнопка «⋯» в шапке: только значок, без фона и рамки, как «назад» и «+». Область нажатия 44 px, при нажатии бледнеет.
// anchorRef нужен меню (Popover): оно открывается прямо от этой кнопки
export function MoreButton({ label, onPress, anchorRef }: { label: string; onPress: () => void; anchorRef?: React.RefObject<ComponentRef<typeof View> | null> }) {
  const colors = useColors();
  return (
    <Pressable
      ref={anchorRef}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.4 : 1 }]}
    >
      <DotsIcon color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
