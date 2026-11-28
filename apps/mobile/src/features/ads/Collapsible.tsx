import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useReduceMotion } from '../../ui/theme';

// Строка формы, которая плавно (по умолчанию 200 мс) скрывается и появляется: высота и прозрачность меняются вместе, форма не «прыгает».
// Скрытая строка остаётся на месте (значение в ней не теряется), но недоступна для нажатий и чтения с экрана
export function Collapsible({ show, children, duration = 200 }: { show: boolean; children: ReactNode; duration?: number }) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(show ? 1 : 0)).current;
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (reduceMotion) progress.setValue(show ? 1 : 0);
    else Animated.timing(progress, { toValue: show ? 1 : 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [show, progress, reduceMotion, duration]);

  return (
    <Animated.View
      pointerEvents={show ? 'auto' : 'none'}
      accessibilityElementsHidden={!show}
      importantForAccessibility={show ? 'auto' : 'no-hide-descendants'}
      style={{ overflow: 'hidden', opacity: progress, height: height === null ? undefined : progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }}
    >
      <View onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>{children}</View>
    </Animated.View>
  );
}
