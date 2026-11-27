import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon, ChevronRightIcon } from './icons';
import { type, useColors, useReduceMotion } from './theme';

// Окно снизу на часть экрана (по умолчанию на полэкрана): ручка и заголовок сверху, затемнение фона. Закрывается свайпом вниз
// за ручку и заголовок, нажатием на затемнённый фон или кнопкой «назад». С `expandable` потянув вверх окно раскрывается выше.
// headerRight — кнопка справа в шапке (например, «Сбросить»).
// Им пользуются «Отправить GIF» в комментариях, выбор категории и района в формах объявлений.
const native = Platform.OS !== 'web';

export function BottomSheet({ visible, onClose, title, height = 0.5, expandable = false, headerRight, children }: { visible: boolean; onClose: () => void; title?: string; height?: number; expandable?: boolean; headerRight?: ReactNode; children: ReactNode }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const BASE = Math.round(screenH * height);
  const FULL = expandable ? Math.round(screenH * 0.88) : BASE;
  const [mounted, setMounted] = useState(false);
  const sheetH = useRef(new Animated.Value(BASE)).current;
  const slide = useRef(new Animated.Value(1)).current; // 1 — за краем экрана, 0 — на месте
  const baseH = useRef(BASE);
  const curH = useRef(BASE);
  const closing = useRef(false);
  const dur = reduceMotion ? 0 : 240;
  // Жест создаётся один раз, поэтому свежие размеры берёт отсюда
  const sizes = useRef({ BASE, FULL });
  sizes.current = { BASE, FULL };
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = sheetH.addListener(({ value }) => {
      curH.current = value;
    });
    return () => sheetH.removeListener(id);
  }, [sheetH]);

  const animateOut = (then: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(slide, { toValue: 1, duration: dur, easing: Easing.in(Easing.cubic), useNativeDriver: native }).start(() => {
      closing.current = false;
      setMounted(false);
      then();
    });
  };

  useEffect(() => {
    if (visible && !mounted) {
      sheetH.setValue(BASE);
      baseH.current = BASE;
      slide.setValue(1);
      setMounted(true);
      Animated.timing(slide, { toValue: 0, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    } else if (!visible && mounted && !closing.current) {
      animateOut(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => animateOut(onClose);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        baseH.current = curH.current;
      },
      onPanResponderMove: (_event, gesture) => {
        sheetH.setValue(Math.max(60, Math.min(sizes.current.FULL, baseH.current - gesture.dy)));
      },
      onPanResponderRelease: (_event, gesture) => {
        const { BASE: base, FULL: full } = sizes.current;
        const projected = curH.current - gesture.vy * 120;
        if (projected < base * 0.65) {
          animateOut(() => onCloseRef.current());
          return;
        }
        const target = Math.abs(projected - full) < Math.abs(projected - base) ? full : base;
        Animated.timing(sheetH, { toValue: target, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      },
    }),
  ).current;

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Закрыть" style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none" style={styles.avoid}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                height: sheetH,
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: insets.bottom,
                transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, FULL] }) }],
              },
            ]}
          >
            <View {...pan.panHandlers} style={styles.grabArea} accessibilityLabel="Потяните вниз, чтобы закрыть">
              <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
              {title || headerRight ? (
                <View style={styles.titleRow}>
                  {title ? (
                    <Text accessibilityRole="header" style={[type.headline, { color: colors.textPrimary }]}>
                      {title}
                    </Text>
                  ) : null}
                  {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
                </View>
              ) : null}
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Строка списка внутри окна: название, у выбранной галочка, у «открывающей» вложенный список стрелка; между строками тонкая линия
export function SheetRow({ title, first = false, selected = false, chevron = false, onPress }: { title: string; first?: boolean; selected?: boolean; chevron?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text numberOfLines={2} style={[type.body, styles.rowText, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {selected ? <CheckIcon color={colors.textPrimary} /> : null}
      {chevron ? <ChevronRightIcon color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  avoid: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  sheet: { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden' },
  grabArea: { alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 6, minHeight: 24 },
  titleRow: { width: '100%', minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  headerRight: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2, opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  rowText: { flex: 1 },
});
