import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, type, useColors } from '../../ui/theme';
import { RoleIcon } from './RoleIcon';

type RoleCardProps = { role: 'student' | 'teacher'; title: string; caption: string; selected: boolean; onPress: () => void };

// Крупная карточка выбора роли: иконка, название, одна строка пояснения; выбранная подсвечена
export function RoleCard({ role, title, caption, selected, onPress }: RoleCardProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${caption}`}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? colors.accentTint : colors.card,
          // Без лишних рамок: невыбранная карточка — только заливка
          borderColor: selected ? colors.accent : 'transparent',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: selected ? colors.card : colors.fill }]}>
        <RoleIcon role={role} color={selected ? colors.accent : colors.text} />
      </View>
      <View style={styles.text}>
        <Text style={[type.title, { color: colors.text }]}>{title}</Text>
        <Text numberOfLines={1} style={[type.subhead, { color: colors.muted }]}>
          {caption}
        </Text>
      </View>
      <View style={[styles.check, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accent : 'transparent' }]}>
        {selected ? <View style={[styles.tick, { borderColor: colors.onAccent }]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 104,
    padding: 20,
    borderWidth: 2,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 4 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  // Галочка: уголок из двух сторон рамки
  tick: { width: 11, height: 6, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '-45deg' }], marginTop: -2 },
});
