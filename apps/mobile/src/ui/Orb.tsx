import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useReduceMotion, useScheme } from './theme';

const SIZE = 188;
const HALO = SIZE * 1.34;
const nativeDriver = Platform.OS !== 'web';

// Бесконечный счётчик 0→1; при «Уменьшении движения» стоит на месте
function useLoop(durationMs: number, enabled: boolean, yoyo = false): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) {
      value.setValue(0);
      return;
    }
    const forward = Animated.timing(value, {
      toValue: 1,
      duration: durationMs,
      easing: yoyo ? Easing.inOut(Easing.sin) : Easing.linear,
      useNativeDriver: nativeDriver,
    });
    const animation = Animated.loop(
      yoyo
        ? Animated.sequence([
            forward,
            Animated.timing(value, {
              toValue: 0,
              duration: durationMs,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: nativeDriver,
            }),
          ])
        : forward,
    );
    animation.start();
    return () => animation.stop();
  }, [value, durationMs, enabled, yoyo]);
  return value;
}

type OrbProps = {
  label: string;
  onPress: () => void;
  // Активна — комната идёт, можно входить: кнопка «дышит» быстрее и светится
  active: boolean;
  disabled?: boolean;
};

// Главная кнопка приложения: бело-серый «живой» шар, внутри которого медленно перетекают облака света
export function Orb({ label, onPress, active, disabled = false }: OrbProps) {
  const scheme = useScheme();
  const reduceMotion = useReduceMotion();
  const moving = !reduceMotion;
  const tempo = active ? 1 : 2.2;

  const spin = useLoop(11000 * tempo, moving);
  const counterSpin = useLoop(17000 * tempo, moving);
  const breath = useLoop(2600 * tempo, moving, true);
  const halo = useLoop(2400, moving && active);
  const press = useRef(new Animated.Value(1)).current;

  const pressTo = (toValue: number) => {
    if (reduceMotion) return;
    Animated.spring(press, { toValue, speed: 30, bounciness: 0, useNativeDriver: nativeDriver }).start();
  };

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotateBack = counterSpin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, active ? 1.05 : 1.025] });
  const drift = breath.interpolate({ inputRange: [0, 1], outputRange: [-10, 12] });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.5, 0] });

  const isDark = scheme === 'dark';
  const base = ['#FFFFFF', '#E2E5EA', '#A7ADBA'] as const;

  return (
    <View style={styles.frame}>
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(140,146,160,0.30)' },
            { opacity: moving ? haloOpacity : 0.25, transform: [{ scale: moving ? haloScale : 0.9 }] },
          ]}
        />
      ) : null}

      <Animated.View style={{ transform: [{ scale: Animated.multiply(press, breathScale) }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
          onPressIn={() => pressTo(0.94)}
          onPressOut={() => pressTo(1)}
          style={[
            styles.orb,
            { shadowColor: isDark ? '#FFFFFF' : '#5B6478', shadowOpacity: active ? (isDark ? 0.35 : 0.45) : 0.18 },
            !active && styles.resting,
          ]}
        >
          <View style={styles.clip}>
            <LinearGradient colors={base} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />

            <Animated.View style={[styles.layer, { transform: [{ rotate }] }]}>
              <LinearGradient
                colors={['rgba(84,92,112,0.9)', 'rgba(84,92,112,0)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.cloud, styles.cloudDark]}
              />
            </Animated.View>

            <Animated.View style={[styles.layer, { transform: [{ rotate: rotateBack }] }]}>
              <LinearGradient
                colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.cloud, styles.cloudLight]}
              />
            </Animated.View>

            <Animated.View style={[styles.layer, { transform: [{ translateY: drift }, { rotate }] }]}>
              <LinearGradient
                colors={['rgba(118,126,146,0.8)', 'rgba(118,126,146,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.cloud, styles.cloudMid]}
              />
            </Animated.View>

            <LinearGradient
              pointerEvents="none"
              colors={['rgba(60,68,88,0)', 'rgba(60,68,88,0.38)']}
              start={{ x: 0.5, y: 0.45 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.55 }}
              style={styles.gloss}
            />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: HALO, height: HALO, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  halo: { position: 'absolute', width: HALO, height: HALO, borderRadius: HALO / 2 },
  orb: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 36,
    elevation: 10,
  },
  resting: { opacity: 0.92 },
  clip: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  // Размытие превращает пятна с чёткой границей в облака
  cloud: { position: 'absolute', filter: 'blur(11px)' },
  cloudDark: { width: SIZE * 0.78, height: SIZE * 0.78, borderRadius: SIZE, top: -SIZE * 0.16, left: -SIZE * 0.22 },
  cloudLight: { width: SIZE * 0.74, height: SIZE * 0.74, borderRadius: SIZE, bottom: -SIZE * 0.12, right: -SIZE * 0.2 },
  cloudMid: { width: SIZE * 0.56, height: SIZE * 0.56, borderRadius: SIZE, top: SIZE * 0.3, left: SIZE * 0.38 },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: SIZE * 0.6 },
});
