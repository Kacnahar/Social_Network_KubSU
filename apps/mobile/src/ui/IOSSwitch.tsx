import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useColors, useReduceMotion, useScheme } from './theme';

// Переключатель в стиле iOS: включён — дорожка primary и контрастный кружок, выключен — дорожка surfaceSecondary.
// Кружок с мягкой тенью, пружинный переход, при нажатии чуть растягивается. Все — одного размера (51×31).
const W = 51;
const H = 31;
const KNOB = 27;
const PAD = 2;
const STRETCH = 6;
// Обводка дорожки: кружок считается от внутреннего края обводки
const BORDER = 1;
const INNER_W = W - BORDER * 2;
const INNER_H = H - BORDER * 2;

type Props = { value: boolean; onValueChange: (value: boolean) => void; accessibilityLabel: string };

export function IOSSwitch({ value, onValueChange, accessibilityLabel }: Props) {
  const colors = useColors();
  const dark = useScheme() === 'dark';
  const reduceMotion = useReduceMotion();
  const on = useRef(new Animated.Value(value ? 1 : 0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const [first, setFirst] = useState(true);

  useEffect(() => {
    if (first || reduceMotion) {
      setFirst(false);
      on.setValue(value ? 1 : 0);
      return;
    }
    // Пружина без отскока, около четверти секунды
    Animated.spring(on, { toValue: value ? 1 : 0, stiffness: 420, damping: 34, mass: 1, useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pressTo = (to: number) => {
    if (reduceMotion) return;
    Animated.timing(press, { toValue: to, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };

  const width = press.interpolate({ inputRange: [0, 1], outputRange: [KNOB, KNOB + STRETCH] });
  // Включённый кружок прижат к правому краю, поэтому при растяжении сдвигается влево
  const left = Animated.subtract(on.interpolate({ inputRange: [0, 1], outputRange: [PAD, INNER_W - KNOB - PAD] }),Animated.multiply(on, press.interpolate({ inputRange: [0, 1], outputRange: [0, STRETCH] })));
  const track = on.interpolate({ inputRange: [0, 1], outputRange: [colors.surfaceSecondary, colors.primary] });
  const knobColor = on.interpolate({ inputRange: [0, 1], outputRange: [dark ? colors.muted : colors.card, colors.onPrimary] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      onPressIn={() => pressTo(1)}
      onPressOut={() => pressTo(0)}
    >
      <Animated.View style={[styles.track, { backgroundColor: track, borderColor: colors.border }]}>
        <Animated.View style={[styles.knob, { width, left, backgroundColor: knobColor, shadowColor: colors.shadow }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, borderWidth: BORDER, justifyContent: 'center' },
  knob: { position: 'absolute', top: (INNER_H - KNOB) / 2, height: KNOB, borderRadius: KNOB / 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 3 },
});
