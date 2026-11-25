import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ChevronRightIcon } from '../../ui/icons';
import { radius, type, useColors, useReduceMotion, useScheme } from '../../ui/theme';

const native = Platform.OS !== 'web';

// Карточка раздела: слева иконка в квадрате, название жирно, под ним серая подпись, справа шеврон.
// Появляется по очереди, при нажатии чуть уменьшается
export function SectionRow({ title, caption, icon, index, onPress }: { title: string; caption: string; icon: (color: string) => ReactNode; index: number; onPress: () => void }) {
  const colors = useColors();
  const light = useScheme() === 'light';
  const reduceMotion = useReduceMotion();
  // На высоком экране (Pro Max) карточки чуть выше, чтобы внизу не было большой пустоты
  const tall = useWindowDimensions().height >= 800;
  const appear = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(appear, { toValue: 1, duration: 220, delay: index * 90, useNativeDriver: native }).start();
  }, [appear, index, reduceMotion]);

  const animate = (down: boolean) => {
    if (reduceMotion) return;
    Animated.spring(press, { toValue: down ? 0.98 : 1, speed: 50, bounciness: 0, useNativeDriver: native }).start();
  };

  return (
    <Animated.View style={{ opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: press }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${caption}`}
        onPress={onPress}
        onPressIn={() => animate(true)}
        onPressOut={() => animate(false)}
        style={[
          styles.card,
          tall && styles.cardTall,
          { backgroundColor: colors.card, borderColor: colors.border, borderWidth: light ? 1 : StyleSheet.hairlineWidth, shadowColor: colors.shadow, shadowOpacity: light ? 1 : 0, elevation: light ? 2 : 0 },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: colors.fill }]}>{icon(colors.textPrimary)}</View>
        <View style={styles.text}>
          <Text numberOfLines={1} style={[type.headline, { color: colors.textPrimary }]}>{title}</Text>
          <Text numberOfLines={2} style={[type.footnote, { color: colors.textSecondary }]}>
            {caption}
          </Text>
        </View>
        <ChevronRightIcon color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    borderRadius: radius.field,
    borderCurve: 'continuous',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  cardTall: { minHeight: 110 },
  icon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
