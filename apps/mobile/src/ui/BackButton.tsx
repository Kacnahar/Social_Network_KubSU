import { StyleSheet, View } from 'react-native';
import { IconButton } from './IconButton';
import { useColors } from './theme';

// Кнопка «назад» в шапке экрана: круглая, со стрелкой-«уголком»
export function BackButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.bar}>
      <IconButton label="Назад" onPress={onPress}>
        <View style={[styles.chevron, { borderColor: colors.text }]} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', marginBottom: -4 },
  chevron: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }], marginLeft: 4 },
});
