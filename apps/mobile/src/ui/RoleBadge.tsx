import type { Role } from '@app/shared';
import { ROLE_LABEL } from '@app/shared';
import { StyleSheet, Text, View } from 'react-native';
import { type, useColors } from './theme';

export function RoleBadge({ role }: { role: Role }) {
  const colors = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: colors.accentTint }]}>
      <Text style={[type.footnote, styles.text, { color: colors.accent }]}>{ROLE_LABEL[role]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  text: { fontWeight: '600' },
});
