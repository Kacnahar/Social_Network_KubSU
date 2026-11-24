import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, type, useColors, useReduceMotion, useScheme } from '../../ui/theme';

const native = Platform.OS !== 'web';

type Props = {
  // dark — залитая карточка (основной цвет), light — светлая; обе в одной чёрно-белой гамме
  tone: 'light' | 'dark';
  title: string;
  caption: string;
  badge: string;
  // Строка-превью внизу: бегущая лента или одна строка (со своим нажатием)
  preview: ReactNode;
  // Большой бледный значок-водяной знак справа
  watermark: (color: string) => ReactNode;
  index: number;
  onPress: () => void;
};

// Крупная карточка раздела каталога: название и плашка с числом, описание, строка свежего и значок-«водяной знак».
// Появляется плавно по очереди, при нажатии чуть уменьшается.
export function SectionCard({ tone, title, caption, badge, preview, watermark, index, onPress }: Props) {
  const colors = useColors();
  const dark = useScheme() === 'dark';
  const reduceMotion = useReduceMotion();
  const appear = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(appear, { toValue: 1, duration: 380, delay: 80 + index * 90, useNativeDriver: native }).start();
  }, [appear, index, reduceMotion]);

  const filled = tone === 'dark';
  const fg = filled ? colors.onPrimary : colors.text;
  const soft = filled ? colors.onPrimary : colors.muted;
  const animatePress = (down: boolean) => {
    if (reduceMotion) return;
    Animated.spring(press, { toValue: down ? 0.97 : 1, speed: 40, bounciness: 0, useNativeDriver: native }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: press }],
      }}
    >
      <View
        style={[
          styles.card,
          filled
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: dark ? StyleSheet.hairlineWidth : 1, shadowColor: colors.shadow, shadowOpacity: dark ? 0 : 1, elevation: dark ? 0 : 3 },
        ]}
      >
        <View pointerEvents="none" style={styles.mark}>
          <View style={{ opacity: 0.12 }}>{watermark(fg)}</View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${caption}. ${badge}`}
          onPress={onPress}
          onPressIn={() => animatePress(true)}
          onPressOut={() => animatePress(false)}
          style={styles.top}
        >
          <View style={styles.titleRow}>
            <Text style={[type.title, styles.title, { color: fg }]}>{title}</Text>
            <View style={[styles.badge, { backgroundColor: filled ? colors.onPrimary : colors.primary }]}>
              <Text style={[type.footnote, styles.badgeText, { color: filled ? colors.primary : colors.onPrimary }]}>{badge}</Text>
            </View>
          </View>
          <Text style={[type.subhead, { color: soft, opacity: filled ? 0.7 : 1 }]}>{caption}</Text>
        </Pressable>
        {preview}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 132,
    borderRadius: radius.field,
    borderCurve: 'continuous',
    padding: 16,
    gap: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  top: { gap: 3 },
  mark: { position: 'absolute', right: -14, top: -8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontWeight: '700' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontWeight: '600' },
});
