import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, Vibration, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon } from './icons';
import { useSound } from './soundStore';
import { type, useColors, useReduceMotion, useScheme } from './theme';

// Всплывающее меню рядом с кнопкой (как контекстные меню iOS). Открывается от нажатой кнопки: под ней, а если снизу
// мало места — над ней; не вылезает за края экрана. «Вырастает» из кнопки пружинкой и закрывается обратно в неё.

export type Rect = { x: number; y: number; width: number; height: number };

// Запоминает, где на экране стоит кнопка. Повесьте `ref` на кнопку, а при нажатии вызовите `measure(...)`
export function useAnchor() {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const measure = (done: (rect: Rect) => void) => {
    const node = ref.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => done({ x, y, width, height }));
  };
  return { ref, measure };
}

const NATIVE = Platform.OS !== 'web';
const MARGIN = 12;
const GAP = 8;

type PopoverProps = {
  visible: boolean;
  anchor: Rect | null;
  onClose: () => void;
  // menu — по ширине содержимого (220–280 px); large — шире, до 85% экрана, высота до 60% экрана (факультет, дата)
  size?: 'menu' | 'large';
  children: ReactNode;
};

export function Popover({ visible, anchor, onClose, size = 'menu', children }: PopoverProps) {
  const colors = useColors();
  const dark = useScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const sound = useSound();
  const [mounted, setMounted] = useState(visible);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  // Анимация появления запускается один раз за открытие. Если потом размер меню изменился (например, поставили галочку и текст стал шире),
  // меню только перестраивается, а не «моргает» заново
  const opened = useRef(false);
  const lastAnchor = useRef<Rect | null>(anchor);
  if (anchor) lastAnchor.current = anchor;

  useEffect(() => {
    if (visible) {
      opened.current = false;
      setBox(null);
      setMounted(true);
    } else if (mounted) {
      if (reduceMotion) {
        progress.setValue(0);
        setMounted(false);
      } else {
        Animated.timing(progress, { toValue: 0, duration: 130, easing: Easing.in(Easing.cubic), useNativeDriver: NATIVE }).start(() => setMounted(false));
      }
    }
    // mounted в зависимостях не нужен: он меняется только отсюда
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Когда размер меню известен и оно поставлено на место — запускаем появление и лёгкую вибрацию (только на Android)
  useEffect(() => {
    if (!visible || !box || opened.current) return;
    opened.current = true;
    if (Platform.OS === 'android' && sound.vibration) Vibration.vibrate(8);
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.spring(progress, { toValue: 1, stiffness: 420, damping: 30, mass: 1, useNativeDriver: NATIVE }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, visible]);

  if (!mounted) return null;

  const a = lastAnchor.current ?? { x: W / 2, y: H / 2, width: 0, height: 0 };
  const maxH = size === 'large' ? Math.round(H * 0.6) : H - insets.top - insets.bottom - MARGIN * 2;
  const fixedWidth = size === 'large' ? Math.min(Math.round(W * 0.85), 380) : undefined;

  // Куда поставить: под кнопкой, если помещается (или если снизу места больше), иначе над ней
  let left = 0;
  let top = 0;
  let originX = 0;
  let originY = 0;
  if (box) {
    const spaceBelow = H - insets.bottom - MARGIN - (a.y + a.height + GAP);
    const spaceAbove = a.y - GAP - insets.top - MARGIN;
    const below = box.h <= spaceBelow || spaceBelow >= spaceAbove;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    top = clamp(below ? a.y + a.height + GAP : a.y - GAP - box.h, insets.top + MARGIN, H - insets.bottom - MARGIN - box.h);
    const cx = a.x + a.width / 2;
    left = clamp(cx > W / 2 ? a.x + a.width - box.w : a.x, MARGIN, W - MARGIN - box.w);
    originX = clamp(cx - left, 0, box.w);
    originY = below ? 0 : box.h;
  }

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1], extrapolate: 'clamp' });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: Animated.multiply(opacity, 0.55) }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть меню" style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          accessibilityViewIsModal
          pointerEvents={box ? 'auto' : 'none'}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setBox((current) => (current && current.w === width && current.h === height ? current : { w: width, h: height }));
          }}
          style={[
            styles.panel,
            size === 'menu' ? { minWidth: 220, maxWidth: 280 } : { width: fixedWidth },
            {
              left,
              top,
              maxHeight: maxH,
              opacity: box ? opacity : 0,
              transform: [{ scale }],
              transformOrigin: `${originX}px ${originY}px`,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: dark ? StyleSheet.hairlineWidth : 0,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <View style={styles.inner}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

type ItemProps = {
  title: string;
  icon?: ReactNode;
  // Если передан (true или false), справа резервируется место под галочку: меню не меняет ширину при выборе
  selected?: boolean;
  danger?: boolean;
  first?: boolean;
  // Текст 15 px вместо 17
  compact?: boolean;
  onPress: () => void;
};

// Пункт меню: тонкая иконка слева, текст, у выбранного галочка справа; опасные — красным; между пунктами тонкая линия
export function PopoverItem({ title, icon, selected, danger = false, first = false, compact = false, onPress }: ItemProps) {
  const colors = useColors();
  const color = danger ? colors.danger : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={title}
      accessibilityState={{ selected: selected === true }}
      onPress={onPress}
      style={({ pressed }) => [styles.item, !first && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }, { opacity: pressed ? 0.6 : 1 }]}
    >
      {icon ? <View style={styles.itemIcon}>{icon}</View> : null}
      <Text numberOfLines={2} style={[compact ? type.subhead : type.body, styles.itemText, { color }]}>
        {title}
      </Text>
      {selected ? <CheckIcon color={colors.textPrimary} /> : selected === false ? <View style={styles.checkSlot} /> : null}
    </Pressable>
  );
}

// Широкая мягкая полоса между группами пунктов (например, перед «Удалить»)
export function PopoverSeparator() {
  const colors = useColors();
  return <View style={[styles.separator, { backgroundColor: colors.surfaceSecondary }]} />;
}

const styles = StyleSheet.create({
  separator: { height: 6 },
  panel: { position: 'absolute', borderRadius: 14, borderCurve: 'continuous', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 10 },
  inner: { borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden', flexShrink: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 16, paddingVertical: 8 },
  itemIcon: { width: 24, alignItems: 'center' },
  itemText: { flex: 1 },
  checkSlot: { width: 24, height: 24 },
});
