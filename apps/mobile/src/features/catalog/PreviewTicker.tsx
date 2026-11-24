import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { type, useReduceMotion } from '../../ui/theme';

const native = Platform.OS !== 'web';
const HEIGHT = 20;
const EVERY = 3500;
const SLIDE = 380;

export type TickerItem = { key: string; text: string; onPress: () => void };

// Строка-превью в карточке: каждые ~3,5 с текущая строка уезжает вверх, снизу заезжает следующая (бегущая лента).
// Стоит на паузе, пока экран не виден или приложение свёрнуто. startDelay сдвигает смену, чтобы две ленты не мигали вместе.
export function PreviewTicker({ items, color, startDelay = 0 }: { items: readonly TickerItem[]; color: string; startDelay?: number }) {
  const reduceMotion = useReduceMotion();
  const [slots, setSlots] = useState<[number, number]>([0, items.length > 1 ? 1 : 0]);
  // Какая из двух строк сейчас на виду
  const front = useRef<0 | 1>(0);
  const next = useRef(1);
  const y0 = useRef(new Animated.Value(0)).current;
  const y1 = useRef(new Animated.Value(HEIGHT)).current;
  const [active, setActive] = useState(true);
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  const count = items.length;
  const running = active && focused && count > 1;

  useEffect(() => {
    if (!running) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const out = front.current === 0 ? y0 : y1;
      const incoming = front.current === 0 ? y1 : y0;
      const incomingSlot = front.current === 0 ? 1 : 0;
      next.current = (next.current + 1) % count;
      setSlots((current) => (incomingSlot === 1 ? [current[0], next.current] : [next.current, current[1]]));
      if (reduceMotion) {
        out.setValue(-HEIGHT);
        incoming.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(out, { toValue: -HEIGHT, duration: SLIDE, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
          Animated.timing(incoming, { toValue: 0, duration: SLIDE, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
        ]).start(() => out.setValue(HEIGHT));
      }
      if (reduceMotion) out.setValue(HEIGHT);
      front.current = incomingSlot as 0 | 1;
      timer = setTimeout(tick, EVERY);
    };
    timer = setTimeout(tick, EVERY + startDelay);
    return () => clearTimeout(timer);
  }, [running, count, reduceMotion, startDelay, y0, y1]);

  const first = items[0];
  if (!first) return null;
  const rows = [slots[0], slots[1]] as const;

  return (
    <View style={styles.window}>
      {[0, 1].map((slot) => {
        const item = items[rows[slot as 0 | 1]] ?? first;
        return (
          <Animated.View key={slot} style={[styles.row, { transform: [{ translateY: slot === 0 ? y0 : y1 }] }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={item.text} onPress={item.onPress} style={styles.press}>
              <Text numberOfLines={1} style={[type.footnote, styles.text, { color }]}>
                {item.text}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  window: { height: HEIGHT, overflow: 'hidden', marginTop: 10 },
  row: { position: 'absolute', left: 0, right: 0, top: 0, height: HEIGHT },
  press: { height: HEIGHT, justifyContent: 'center' },
  text: { fontWeight: '500' },
});
