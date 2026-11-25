import { Pressable, StyleSheet } from 'react-native';
import { MessageIcon } from './icons';
import { useColors } from './theme';

// Кнопка личных сообщений в шапке: только тонкий знак, без фона и рамки. Область нажатия 44 px, при нажатии бледнеет
export function MessagesButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Сообщения" onPress={onPress} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.4 : 1 }]}>
      <MessageIcon color={colors.textPrimary} size={26} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
