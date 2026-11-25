import type { Role } from '@app/shared';
import { ROLE_LABEL } from '@app/shared';
import { StyleSheet, Text, View } from 'react-native';
import { RoleIcon } from '../features/auth/RoleIcon';
import { type, useColors } from './theme';

// Раскрытая книга: две страницы с корешком. Рисуется в «большой» сетке 30×30 и уменьшается до ~12 px, поэтому линии тонкие
function OpenBook({ color }: { color: string }) {
  return (
    <View style={styles.big}>
      <View style={[styles.page, styles.pageLeft, { borderColor: color }]} />
      <View style={[styles.page, styles.pageRight, { borderColor: color }]} />
      <View style={[styles.spine, { backgroundColor: color }]} />
    </View>
  );
}

// Бейдж роли: тонкая иконка (шапочка у студента, книга у преподавателя), подпись, мягкая подложка без рамки
export function RoleBadge({ role }: { role: Role }) {
  const colors = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.scale}>
          {role === 'teacher' ? <OpenBook color={colors.textPrimary} /> : <RoleIcon role="student" color={colors.textPrimary} />}
        </View>
      </View>
      <Text style={[type.footnote, styles.text, { color: colors.textPrimary }]}>{ROLE_LABEL[role]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderCurve: 'continuous' },
  icon: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  // Иконка нарисована на сетке 30×30; сжимаем до 12 px (0,4)
  scale: { width: 30, height: 30, transform: [{ scale: 0.4 }] },
  text: { fontSize: 12.5, lineHeight: 16, fontWeight: '500' },

  big: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  page: { position: 'absolute', top: 6, width: 13, height: 18, borderWidth: 2.4 },
  pageLeft: { left: 2, borderTopLeftRadius: 4, borderBottomLeftRadius: 4, borderRightWidth: 1.2 },
  pageRight: { right: 2, borderTopRightRadius: 4, borderBottomRightRadius: 4, borderLeftWidth: 1.2 },
  spine: { position: 'absolute', top: 7, width: 2, height: 16 },
});
