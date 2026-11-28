import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type, useColors } from './theme';

// Галочка с подписью; нажимается вся строка
export function Checkbox({ label, checked, onChange, compact = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; compact?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      hitSlop={6}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, compact && styles.rowCompact, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.box, compact && styles.boxCompact, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : 'transparent' }]}>
        {checked ? <View style={[styles.tick, { borderColor: colors.onPrimary }]} /> : null}
      </View>
      <Text style={[type.subhead, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32, marginLeft: 4 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowCompact: { marginLeft: 0, minHeight: 44 },
  boxCompact: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5 },
  tick: { width: 11, height: 6, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '-45deg' }], marginTop: -2 },
});
