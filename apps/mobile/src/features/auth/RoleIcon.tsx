import { StyleSheet, View } from 'react-native';

// Одноцветные иконки ролей, нарисованные из простых фигур: цвет задаётся снаружи и следует теме
export function RoleIcon({ role, color }: { role: 'student' | 'teacher'; color: string }) {
  if (role === 'student') {
    // Академическая шапочка: ромб-верх, основание и кисточка
    return (
      <View style={styles.box}>
        <View style={[styles.capTop, { backgroundColor: color }]} />
        <View style={[styles.capBase, { borderColor: color }]} />
        <View style={[styles.tassel, { backgroundColor: color }]} />
        <View style={[styles.tasselEnd, { backgroundColor: color }]} />
      </View>
    );
  }
  // Доска на подставке с двумя строчками
  return (
    <View style={styles.box}>
      <View style={[styles.board, { borderColor: color }]}>
        <View style={[styles.line, styles.lineLong, { backgroundColor: color }]} />
        <View style={[styles.line, styles.lineShort, { backgroundColor: color }]} />
      </View>
      <View style={[styles.stand, { backgroundColor: color }]} />
      <View style={[styles.foot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  capTop: { position: 'absolute', top: 3, width: 17, height: 17, borderRadius: 2, transform: [{ scaleY: 0.5 }, { rotate: '45deg' }] },
  capBase: {
    position: 'absolute',
    top: 14,
    width: 14,
    height: 8,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  tassel: { position: 'absolute', top: 11, right: 2, width: 2, height: 10, borderRadius: 1 },
  tasselEnd: { position: 'absolute', top: 20, right: 0.5, width: 5, height: 5, borderRadius: 2.5 },

  board: { position: 'absolute', top: 3, width: 26, height: 17, borderWidth: 2, borderRadius: 4, justifyContent: 'center', paddingLeft: 4, gap: 3 },
  line: { height: 2, borderRadius: 1 },
  lineLong: { width: 13 },
  lineShort: { width: 8 },
  stand: { position: 'absolute', top: 20, width: 2, height: 5 },
  foot: { position: 'absolute', top: 25, width: 14, height: 2, borderRadius: 1 },
});
