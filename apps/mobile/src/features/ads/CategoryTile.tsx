import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { type, useColors, useReduceMotion, useScheme } from '../../ui/theme';

const native = Platform.OS !== 'web';

// Квадратная плитка категории: толстоватая иконка слева сверху, название жирно внизу, под ним серая подпись.
// Появляется по очереди, при нажатии чуть вдавливается
export function CategoryTile({ title, caption, icon, index, onPress }: { title: string; caption: string; icon: (color: string) => ReactNode; index: number; onPress: () => void }) {
  const colors = useColors();
  const light = useScheme() === 'light';
  const reduceMotion = useReduceMotion();
  const appear = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(appear, { toValue: 1, duration: 360, delay: 60 + index * 80, useNativeDriver: native }).start();
  }, [appear, index, reduceMotion]);

  const animate = (down: boolean) => {
    if (reduceMotion) return;
    Animated.spring(press, { toValue: down ? 0.95 : 1, speed: 50, bounciness: 0, useNativeDriver: native }).start();
  };

  return (
    <Animated.View style={[styles.cell, { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: press }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${caption}`}
        onPress={onPress}
        onPressIn={() => animate(true)}
        onPressOut={() => animate(false)}
        style={[styles.tile, { backgroundColor: colors.fill, borderColor: colors.border, shadowColor: colors.shadow, shadowOpacity: light ? 1 : 0, elevation: light ? 2 : 0 }]}
      >
        <View style={styles.icon}>{icon(colors.textPrimary)}</View>
        <View style={styles.text}>
          <Text style={[type.headline, styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[type.footnote, { color: colors.textSecondary }]}>{caption}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: { flexBasis: '47%', flexGrow: 1 },
  tile: {
    aspectRatio: 1,
    minHeight: 166,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  icon: { flexShrink: 0, alignSelf: 'flex-start' },
  text: { gap: 3 },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
});
