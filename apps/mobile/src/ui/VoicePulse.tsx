import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useReduceMotion } from './theme';

// Как «оживает» круглая кнопка «Войс», пока вкладка открыта. Выбор одной строкой:
//   'pulse' — вариант А, «пульс динамика»: круг мягко увеличивается до 1,07 и возвращается (цикл 1,4 с);
//   'rings' — вариант Б, «звуковые волны»: круг почти стоит, от него расходятся два тонких кольца и тают (цикл 1,8 с).
// При «Уменьшении движения» и когда вкладка закрыта, анимации нет: круг плавно возвращается к обычному виду.
export type VoiceAnimation = 'pulse' | 'rings';
export const VOICE_ANIMATION: VoiceAnimation = 'rings';

const native = Platform.OS !== 'web';
const PULSE_MAX = 1.07;
const PULSE_HALF = 700; // половина цикла, мс
const RING_MS = 1800;
const RING_REACH = 1.55;

export function VoicePulse({ active, size, color, mode = VOICE_ANIMATION, children }: { active: boolean; size: number; color: string; mode?: VoiceAnimation; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;
  // Общая «громкость» колец: плавно гаснет, когда вкладку закрывают
  const on = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const running = active && !reduceMotion;
    const loops: Animated.CompositeAnimation[] = [];

    if (running && mode === 'pulse') {
      const ease = Easing.inOut(Easing.sin);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: PULSE_MAX, duration: PULSE_HALF, easing: ease, useNativeDriver: native }),
          Animated.timing(scale, { toValue: 1, duration: PULSE_HALF, easing: ease, useNativeDriver: native }),
        ]),
      );
      loop.start();
      loops.push(loop);
    } else {
      Animated.timing(scale, { toValue: 1, duration: reduceMotion ? 0 : 240, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    }

    if (running && mode === 'rings') {
      on.setValue(1);
      const ring = (value: Animated.Value, delay: number) => {
        const loop = Animated.sequence([
          Animated.delay(delay),
          Animated.loop(Animated.timing(value, { toValue: 1, duration: RING_MS, easing: Easing.out(Easing.quad), useNativeDriver: native }), { iterations: -1, resetBeforeIteration: true }),
        ]);
        loop.start();
        loops.push(loop);
      };
      ringA.setValue(0);
      ringB.setValue(0);
      ring(ringA, 0);
      ring(ringB, RING_MS / 2);
    } else {
      Animated.timing(on, { toValue: 0, duration: reduceMotion ? 0 : 240, useNativeDriver: native }).start();
    }

    return () => loops.forEach((loop) => loop.stop());
  }, [active, reduceMotion, mode, scale, ringA, ringB, on]);

  const ringStyle = (value: Animated.Value) => ({
    opacity: Animated.multiply(value.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), on),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, RING_REACH] }) }],
  });

  return (
    <View style={{ width: size, height: size }}>
      {mode === 'rings' ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: color }, ringStyle(ringA)]} />
          <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: color }, ringStyle(ringB)]} />
        </>
      ) : null}
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', left: 0, top: 0, borderWidth: 1.5 },
});
