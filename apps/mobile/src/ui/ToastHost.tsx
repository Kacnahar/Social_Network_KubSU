import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearToast, useToast } from './toastStore';
import { type, useColors, useReduceMotion } from './theme';

// Одно место, где рисуются короткие уведомления: маленькая «таблетка» над нижней панелью, 1,8 секунды
export function ToastHost() {
  const toast = useToast();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const id = toast?.id;

  useEffect(() => {
    if (id === undefined) return;
    opacity.setValue(0);
    const show = Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 0 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    show.start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 0 : 220, useNativeDriver: false }).start(() => clearToast(id));
    }, 1800);
    return () => {
      clearTimeout(timer);
      show.stop();
    };
  }, [id, opacity, reduceMotion]);

  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 16) + 90 }]}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.pill, { backgroundColor: colors.primary, opacity }]}>
        <Text style={[type.subhead, { color: colors.onPrimary }]}>{toast.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
});
