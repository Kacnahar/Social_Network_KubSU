import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, type ElementType } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useColors, useReduceMotion, useScheme } from '../../ui/theme';

const DEFAULT_SIZE = 188;
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
  // Не задано — шар просто украшение внутри другой кнопки и сам не нажимается
  onPress?: () => void;
  // Активна — комната идёт, можно входить: кнопка «дышит» быстрее и светится
  active: boolean;
  disabled?: boolean;
  // Диаметр шара; свечение, облака и тень растут и уменьшаются вместе с ним
  size?: number;
};

// Главная кнопка приложения: бело-серый «живой» шар, внутри которого медленно перетекают облака света
export function Orb({ label, onPress, active, disabled = false, size = DEFAULT_SIZE }: OrbProps) {
  const styles = useMemo(() => createStyles(size), [size]);
  // Кнопку в кнопку вкладывать нельзя: без onPress шар рисуется обычным блоком
  const Shell: ElementType = onPress ? Pressable : View;
  const scheme = useScheme();
  const colors = useColors();
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
  const drift = breath.interpolate({ inputRange: [0, 1], outputRange: [-10 * (size / DEFAULT_SIZE), 12 * (size / DEFAULT_SIZE)] });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.5, 0] });

  const isDark = scheme === 'dark';
  const base = [colors.surface, colors.surfaceSecondary, colors.border] as const;

  return (
    <View style={styles.frame}>
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { backgroundColor: colors.accentTint },
            { opacity: moving ? haloOpacity : 0.25, transform: [{ scale: moving ? haloScale : 0.9 }] },
          ]}
        />
      ) : null}

      <Animated.View style={{ transform: [{ scale: Animated.multiply(press, breathScale) }] }}>
        <Shell
          {...(onPress
            ? {
                accessibilityRole: 'button' as const,
                accessibilityLabel: label,
                accessibilityState: { disabled },
                disabled,
                onPress,
                onPressIn: () => pressTo(0.94),
                onPressOut: () => pressTo(1),
              }
            : { accessible: false })}
          style={[
            styles.orb,
            { shadowColor: colors.primary, shadowOpacity: active ? (isDark ? 0.35 : 0.45) : 0.18 },
            !active && styles.resting,
          ]}
        >
          <View style={styles.clip}>
            <LinearGradient colors={base} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />

            <Animated.View style={[styles.layer, { transform: [{ rotate }] }]}>
              <LinearGradient
                colors={[colors.textSecondary, 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.cloud, styles.cloudDark]}
              />
            </Animated.View>

            <Animated.View style={[styles.layer, { transform: [{ rotate: rotateBack }] }]}>
              <LinearGradient
                colors={[colors.surface, 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.cloud, styles.cloudLight]}
              />
            </Animated.View>

            <Animated.View style={[styles.layer, { transform: [{ translateY: drift }, { rotate }] }]}>
              <LinearGradient
                colors={[colors.border, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.cloud, styles.cloudMid]}
              />
            </Animated.View>

            <LinearGradient
              pointerEvents="none"
              colors={['transparent', colors.textSecondary]}
              start={{ x: 0.5, y: 0.45 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={[colors.surface, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.55 }}
              style={styles.gloss}
            />
          </View>
        </Shell>
      </Animated.View>
    </View>
  );
}

function createStyles(size: number) {
  const k = size / DEFAULT_SIZE;
  const halo = size * 1.34;
  return StyleSheet.create({
    frame: { width: halo, height: halo, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
    halo: { position: 'absolute', width: halo, height: halo, borderRadius: halo / 2 },
    orb: {
      width: size,
      height: size,
      borderRadius: size / 2,
      shadowOffset: { width: 0, height: 14 * k },
      shadowRadius: 36 * k,
      elevation: Math.max(2, Math.round(10 * k)),
    },
    resting: { opacity: 0.92 },
    clip: {
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'transparent',
    },
    layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
    // Размытие превращает пятна с чёткой границей в облака
    cloud: { position: 'absolute', filter: `blur(${11 * k}px)` },
    cloudDark: { width: size * 0.78, height: size * 0.78, borderRadius: size, top: -size * 0.16, left: -size * 0.22 },
    cloudLight: { width: size * 0.74, height: size * 0.74, borderRadius: size, bottom: -size * 0.12, right: -size * 0.2 },
    cloudMid: { width: size * 0.56, height: size * 0.56, borderRadius: size, top: size * 0.3, left: size * 0.38 },
    gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: size * 0.6 },
  });
}
