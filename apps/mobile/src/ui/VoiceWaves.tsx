import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useReduceMotion } from './theme';

// Иконка «Войс»: пять вертикальных полосок. Когда вкладка открыта (playing), каждая полоска мягко «играет»
// в своём ритме, как эквалайзер; когда закрыта — плавно опускается в спокойную форму и замирает.
// При «Уменьшении движения» полоски не двигаются.

const REST = [0.35, 0.7, 1, 0.7, 0.35]; // спокойная форма (доли высоты)
const LOW = [0.2, 0.3, 0.45, 0.3, 0.2]; // самое низкое положение во время игры
const HIGH = [0.75, 1, 1, 0.95, 0.7]; // самое высокое
const BEAT = [520, 430, 610, 470, 560]; // у каждой полоски свой ритм, мс

export function VoiceWaves({ color, playing, size = 24 }: { color: string; playing: boolean; size?: number }) {
  const reduceMotion = useReduceMotion();
  const scales = useRef(REST.map((value) => new Animated.Value(value))).current;
  const native = Platform.OS !== 'web';
  const bar = Math.max(2, Math.round(size / 9));

  useEffect(() => {
    const animations = scales.map((scale, index) => {
      if (!playing || reduceMotion) {
        return Animated.timing(scale, { toValue: REST[index] ?? 1, duration: reduceMotion ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: native });
      }
      const ease = Easing.inOut(Easing.sin);
      return Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: HIGH[index] ?? 1, duration: BEAT[index] ?? 500, easing: ease, useNativeDriver: native }),
          Animated.timing(scale, { toValue: LOW[index] ?? 0.3, duration: BEAT[index] ?? 500, easing: ease, useNativeDriver: native }),
        ]),
      );
    });
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [playing, reduceMotion, scales, native]);

  return (
    <View style={[styles.wave, { width: size, height: size, gap: bar }]}>
      {scales.map((scale, index) => (
        <Animated.View key={index} style={{ width: bar, height: size, borderRadius: bar / 2, backgroundColor: color, transform: [{ scaleY: scale }] }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
