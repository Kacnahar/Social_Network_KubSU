import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useColors, useReduceMotion } from './theme';

// Иллюстрация стартового экрана: люди-кружки вокруг общего центра на двух орбитах.
// Это нейтральный знак, а не логотип вуза: название и логотип вуза нельзя использовать до его
// разрешения (см. CLAUDE.md). Когда разрешение будет, центр можно заменить картинкой эмблемы.
//
// Движение — только при появлении: кружки по очереди «собираются» к своим местам пружиной без отскока.
// Постоянной зацикленной анимации нет; при «Уменьшении движения» всё сразу стоит на месте.

type Dot = { angle: number; orbit: 0 | 1; size: number; tone: 'accent' | 'tint' | 'gold' };

const DOTS: readonly Dot[] = [
  { angle: -90, orbit: 1, size: 0.15, tone: 'tint' },
  { angle: -28, orbit: 0, size: 0.11, tone: 'gold' },
  { angle: 22, orbit: 1, size: 0.19, tone: 'accent' },
  { angle: 96, orbit: 0, size: 0.13, tone: 'tint' },
  { angle: 150, orbit: 1, size: 0.12, tone: 'gold' },
  { angle: 205, orbit: 0, size: 0.16, tone: 'accent' },
  { angle: 318, orbit: 1, size: 0.1, tone: 'tint' },
];

export function Emblem({ size = 240 }: { size?: number }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const appear = useRef(DOTS.map(() => new Animated.Value(0))).current;
  const core = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const all = [core, ...appear];
    if (reduceMotion) {
      all.forEach((value) => value.setValue(1));
      return;
    }
    const spring = (value: Animated.Value) =>
      Animated.spring(value, { toValue: 1, speed: 6, bounciness: 0, useNativeDriver: Platform.OS !== 'web' });
    const animation = Animated.stagger(70, all.map(spring));
    animation.start();
    return () => animation.stop();
  }, [appear, core, reduceMotion]);

  const orbits = [size * 0.3, size * 0.45];
  const coreSize = size * 0.3;
  const tone = { accent: colors.accent, tint: colors.accentTint, gold: colors.highlight };

  return (
    <View accessibilityRole="image" accessibilityLabel="Студенты вокруг общего центра" style={{ width: size, height: size }}>
      {orbits.map((radius) => (
        <View
          key={radius}
          style={[
            styles.centered,
            { width: radius * 2, height: radius * 2, borderRadius: radius, left: size / 2 - radius, top: size / 2 - radius, borderColor: colors.border },
            styles.orbit,
          ]}
        />
      ))}

      <Animated.View
        style={[
          styles.centered,
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            left: (size - coreSize) / 2,
            top: (size - coreSize) / 2,
            backgroundColor: colors.accent,
            opacity: core,
            transform: [{ scale: core.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      >
        {/* Простой силуэт человека: голова и плечи */}
        <View style={[styles.head, { width: coreSize * 0.26, height: coreSize * 0.26, borderRadius: coreSize * 0.13, backgroundColor: colors.onAccent }]} />
        <View
          style={{
            width: coreSize * 0.5,
            height: coreSize * 0.24,
            borderTopLeftRadius: coreSize * 0.25,
            borderTopRightRadius: coreSize * 0.25,
            backgroundColor: colors.onAccent,
          }}
        />
      </Animated.View>

      {DOTS.map((dot, index) => {
        const radians = (dot.angle * Math.PI) / 180;
        const distance = orbits[dot.orbit] ?? 0;
        const diameter = size * dot.size;
        const x = Math.cos(radians) * distance;
        const y = Math.sin(radians) * distance;
        const progress = appear[index] ?? core;
        return (
          <Animated.View
            key={dot.angle}
            style={[
              styles.centered,
              {
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                left: size / 2 - diameter / 2,
                top: size / 2 - diameter / 2,
                backgroundColor: tone[dot.tone],
                opacity: progress,
                // Кружок выезжает из центра на своё место на орбите
                transform: [
                  { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  orbit: { borderWidth: StyleSheet.hairlineWidth * 2 },
  head: { marginBottom: 3 },
});
