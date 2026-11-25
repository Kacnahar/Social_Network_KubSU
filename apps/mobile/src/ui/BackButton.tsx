import { Pressable, StyleSheet, View } from 'react-native';
import { BackIcon } from './icons';
import { useColors } from './theme';

// Кнопка «назад» в шапке экрана: только тонкий знак «<», без фона и рамки.
// Область нажатия 44 px, при нажатии значок слегка бледнеет.
// inline — для шапки, где кнопка стоит в ряду с другими элементами; без него кнопка занимает свою строку.
export function BackButton({ onPress, inline = false }: { onPress: () => void; inline?: boolean }) {
  const colors = useColors();
  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Назад"
      hitSlop={{ top: 0, bottom: 0, left: 4, right: 4 }}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.4 : 1 }]}
    >
      <BackIcon color={colors.textPrimary} />
    </Pressable>
  );
  return inline ? button : <View style={styles.bar}>{button}</View>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', marginBottom: -4 },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
