import { Pressable, StyleSheet } from 'react-native';
import { PlusIcon } from './icons';
import { useColors } from './theme';

// Кнопка «+» в шапке (новый пост, новое объявление): только тонкий знак, без фона и рамки.
// Область нажатия 44 px, при нажатии значок слегка бледнеет.
export function PlusButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.4 : 1 }]}
    >
      <PlusIcon color={colors.textPrimary} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
