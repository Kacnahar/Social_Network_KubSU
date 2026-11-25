import { useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useReduceMotion } from './theme';

// Строка, которая при удалении плавно сворачивается и гаснет, и только потом убирается из списка.
// Высота фиксируется только на время сворачивания, поэтому до этого содержимое может свободно менять размер
export function CollapseRow({ onRemove, children }: { onRemove: () => void; children: (remove: () => void) => ReactNode }) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const measured = useRef(0);
  const [fromHeight, setFromHeight] = useState<number | null>(null);

  const remove = () => {
    if (reduceMotion || measured.current === 0) return onRemove();
    setFromHeight(measured.current);
    Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(onRemove);
  };

  return (
    <Animated.View
      style={[
        { opacity: progress, overflow: 'hidden' },
        fromHeight !== null ? { height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, fromHeight] }) } : null,
      ]}
    >
      <View onLayout={(event) => (measured.current = event.nativeEvent.layout.height)}>{children(remove)}</View>
    </Animated.View>
  );
}
