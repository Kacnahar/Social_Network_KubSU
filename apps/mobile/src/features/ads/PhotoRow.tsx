import { useEffect, useRef, useState, type ComponentRef, type Ref } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, Vibration, View, type ViewStyle } from 'react-native';
import { CloseIcon, PencilIcon, PlusIcon } from '../../ui/icons';
import { useSound } from '../../ui/soundStore';
import { darkColors, radius, type, useColors, useReduceMotion } from '../../ui/theme';
import { movePhoto } from './sell';

// Ряд фото объявления: квадраты 64 px, в конце «+». Ряд листается вбок. На каждом фото «✕»,
// первое помечено «Обложка». Долгое нажатие (300 мс) и перетаскивание меняют порядок: фото приподнимается с тенью,
// на Android слегка вибрирует, остальные раздвигаются. В правом верхнем углу карандаш (на компьютере — при наведении,
// на телефоне — после короткого нажатия на фото) открывает обрезку 1:1; «✕» удаления — в левом верхнем углу.
const SIZE = 64;
const GAP = 10;
const STEP = SIZE + GAP;
const HOLD_MS = 300;
// Мышь (компьютер): фото берётся сразу, как только мышь сдвинулась. Палец (телефон): нужно долгое нажатие 300 мс,
// иначе движение пальцем — это прокрутка ряда. Определяем по самому событию, а не по размеру окна: в браузере с «телефонным»
// размером мышь остаётся мышью
const isMouseEvent = (event: { nativeEvent?: unknown }): boolean => {
  if (Platform.OS !== 'web') return false;
  const native = event.nativeEvent as { type?: string; pointerType?: string } | undefined;
  return native?.pointerType === 'mouse' || (native?.type?.startsWith('mouse') ?? false);
};
const MOUSE_START = 4;

type Drag = { from: number; to: number } | null;

// Касание началось внутри ряда фото? Форма по этому флагу решает, прятать ли карандаш (касание в другом месте — прячет).
// stopPropagation для этого нельзя: в браузере он обрывает событие до системы жестов, и перетаскивание перестаёт работать
export const photoTouch = { inside: false };

export function PhotoRow({ photos, max, onChange, onAddPress, addRef, onEdit, hideSignal }: { photos: string[]; max: number; onChange: (photos: string[]) => void; onAddPress: () => void; addRef: Ref<ComponentRef<typeof View>>; onEdit: (uri: string) => void; hideSignal: number }) {
  const colors = useColors();
  const [drag, setDrag] = useState<Drag>(null);
  // Фото, на котором на телефоне показан карандаш; касание в другом месте (hideSignal) его прячет
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => setActive(null), [hideSignal]);

  return (
    <ScrollView horizontal scrollEnabled={drag === null} onTouchStart={() => (photoTouch.inside = true)} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.row}>
      {photos.map((uri, index) => (
        <Thumb
          key={uri}
          uri={uri}
          index={index}
          count={photos.length}
          drag={drag}
          onDrag={setDrag}
          active={active === uri}
          onTap={() => setActive((current) => (current === uri ? null : uri))}
          onEdit={() => onEdit(uri)}
          onRemove={() => onChange(photos.filter((item) => item !== uri))}
          onDrop={(from, to) => onChange(movePhoto(photos, from, to))}
        />
      ))}
      {photos.length < max ? (
        <View ref={addRef} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Добавить фото"
            onPress={onAddPress}
            style={({ pressed }) => [styles.add, { borderColor: colors.muted, opacity: pressed ? 0.5 : 1 }]}
          >
            <PlusIcon color={colors.muted} size={22} />
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Thumb({ uri, index, count, drag, onDrag, active, onTap, onEdit, onRemove, onDrop }: { uri: string; index: number; count: number; drag: Drag; onDrag: (drag: Drag) => void; active: boolean; onTap: () => void; onEdit: () => void; onRemove: () => void; onDrop: (from: number, to: number) => void }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const sound = useSound();
  const [hovered, setHovered] = useState(false);
  const pencil = useRef(new Animated.Value(0)).current;
  const showPencil = (hovered || active) && !drag;
  useEffect(() => {
    if (reduceMotion) pencil.setValue(showPencil ? 1 : 0);
    else Animated.timing(pencil, { toValue: showPencil ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [showPencil, pencil, reduceMotion]);
  const tx = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  // Обработчик жестов создаётся один раз, поэтому свежие значения берёт из этой «записки»
  const live = useRef({ index, count, onDrag, onDrop, onTap, vibrate: sound.vibration });
  live.current = { index, count, onDrag, onDrop, onTap, vibrate: sound.vibration };
  const armed = useRef(false);
  const mouse = useRef(false);
  // «Взять» фото: приподнять, дать вибрацию (Android) и начать перетаскивание
  const arm = () => {
    if (armed.current) return;
    armed.current = true;
    timer.current = null;
    if (Platform.OS === 'android' && live.current.vibrate) Vibration.vibrate(12);
    live.current.onDrag({ from: live.current.index, to: live.current.index });
    if (reduceMotion) lift.setValue(1);
    else Animated.timing(lift, { toValue: 1, duration: 140, useNativeDriver: false }).start();
  };
  const moved = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = useRef(0);

  const move = (to: number, duration = 160) => {
    if (reduceMotion) shift.setValue(to);
    else Animated.timing(shift, { toValue: to, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };

  // Соседи расступаются, пока одно фото тащат
  useEffect(() => {
    // Перетаскивание закончилось: фото уже стоят в новом порядке, поэтому сдвиг сбрасываем сразу — видимое положение не меняется
    if (!drag) {
      shift.stopAnimation();
      shift.setValue(0);
      return;
    }
    if (drag.from === index) return move(0);
    const { from, to } = drag;
    move(from < to && index > from && index <= to ? -STEP : from > to && index >= to && index < from ? STEP : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, index]);

  const finish = (dx: number, cancelled = false) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!armed.current) {
      // Не успели «взять» фото и почти не двигали пальцем — это обычное короткое нажатие
      if (!moved.current && !cancelled) live.current.onTap();
      return;
    }
    armed.current = false;
    const { index: from } = live.current;
    const to = target.current;
    live.current.onDrag(null);
    shift.setValue(0);
    // Фото уже стоит на новом месте: плавно «дотягиваем» его из того места, где отпустили
    tx.setValue(dx - (to - from) * STEP);
    live.current.onDrop(from, to);
    if (reduceMotion) tx.setValue(0);
    else Animated.spring(tx, { toValue: 0, stiffness: 420, damping: 32, mass: 1, useNativeDriver: false }).start();
    Animated.timing(lift, { toValue: 0, duration: 140, useNativeDriver: false }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        armed.current = false;
        moved.current = false;
        target.current = live.current.index;
        mouse.current = isMouseEvent(event);
        // Телефон: ждём долгого нажатия
        if (!mouse.current) timer.current = setTimeout(arm, HOLD_MS);
      },
      onPanResponderMove: (_event, gesture) => {
        if (!armed.current) {
          const far = Math.abs(gesture.dx) > (mouse.current ? MOUSE_START : 8) || Math.abs(gesture.dy) > (mouse.current ? MOUSE_START : 8);
          if (!far) return;
          if (mouse.current) {
            // Компьютер: мышь сдвинулась — фото «взято»
            moved.current = true;
            arm();
          } else {
            // Телефон: повели пальцем до долгого нажатия — это прокрутка ряда, а не перестановка
            moved.current = true;
            if (timer.current) clearTimeout(timer.current);
            timer.current = null;
            return;
          }
        }
        tx.setValue(gesture.dx);
        const { index: from, count: total } = live.current;
        const to = Math.max(0, Math.min(total - 1, Math.round(from + gesture.dx / STEP)));
        if (to !== target.current) {
          target.current = to;
          live.current.onDrag({ from, to });
        }
      },
      onPanResponderTerminationRequest: () => !armed.current,
      onPanResponderRelease: (_event, gesture) => finish(gesture.dx),
      onPanResponderTerminate: (_event, gesture) => finish(gesture.dx, true),
    }),
  ).current;

  const dragging = drag?.from === index;
  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const hover = Platform.OS === 'web' ? ({ onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } as object) : null;

  return (
    <Animated.View
      {...responder.panHandlers}
      {...hover}
      accessibilityLabel={`Фото ${index + 1} из ${count}`}
      style={[
        styles.thumbBox,
        webGrab,
        {
          zIndex: dragging ? 10 : 0,
          backgroundColor: colors.fill,
          shadowColor: colors.shadow === 'transparent' ? darkColors.scrim : colors.shadow,
          shadowOpacity: lift,
          transform: [{ translateX: Animated.add(tx, shift) }, { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { scale }],
        },
      ]}
    >
      <Image source={{ uri }} style={styles.thumb} />
      {index === 0 ? (
        <View pointerEvents="none" style={[styles.cover, { backgroundColor: colors.primary }]}>
          <Text style={[type.caption, { color: colors.onPrimary }]}>Обложка</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Убрать фото ${index + 1}`}
        hitSlop={8}
        onPress={onRemove}
        style={[styles.remove, { backgroundColor: colors.primary }]}
      >
        <CloseIcon color={colors.onPrimary} size={10} />
      </Pressable>
      <Animated.View pointerEvents={showPencil ? 'auto' : 'none'} style={[styles.pencilBox, { opacity: pencil }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Обрезать фото ${index + 1}`} hitSlop={6} onPress={onEdit} style={[styles.pencil, { backgroundColor: darkColors.scrim }]}>
          <PencilIcon color={darkColors.text} size={15} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// Курсор «рука» при наведении — только в браузере: в типах React Native такого значения нет
const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab' } as unknown as ViewStyle) : null;

const styles = StyleSheet.create({
  row: { gap: GAP, paddingVertical: 8, paddingRight: 6, alignItems: 'center' },
  thumbBox: { width: SIZE, height: SIZE, borderRadius: 10, borderCurve: 'continuous', shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, userSelect: 'none' },
  thumb: { width: SIZE, height: SIZE, borderRadius: 10, borderCurve: 'continuous' },
  add: { width: SIZE, height: SIZE, borderRadius: 10, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  cover: { position: 'absolute', left: 4, bottom: 4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: radius.control - 4 },
  // «✕» удаления — в левом верхнем углу внутри фото; карандаш — в правом верхнем
  remove: { position: 'absolute', left: 4, top: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pencilBox: { position: 'absolute', right: 4, top: 4 },
  pencil: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
