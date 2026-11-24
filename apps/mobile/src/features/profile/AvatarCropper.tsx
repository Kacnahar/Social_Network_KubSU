import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';
import { FlipHorizontalIcon, FlipVerticalIcon, MinusIcon, PlusIcon, RotateLeftIcon, RotateRightIcon } from '../../ui/icons';
import { darkColors, type, useReduceMotion } from '../../ui/theme';
import { baseScale, clampOffset, clampZoom, cropRect, MAX_ZOOM, maxOffset, outputSize, rubberBand } from './cropMath';

// Экран обрезки фото профиля: тёмный (в обеих темах), круглая рамка по центру, снаружи затемнено.
// Фото двигается пальцем, масштабируется двумя пальцами (в браузере — колёсиком), двойной тап увеличивает и возвращает.
// За краем фото «пружинит» обратно. Движения считаются встроенным PanResponder и Animated (reanimated в проекте нет).

type Props = { uri: string; onCancel: () => void; onDone: (croppedUri: string) => void };

const C = darkColors;
const DOUBLE_TAP_MS = 300;

type Pt = { pageX: number; pageY: number };
const dist = (a: Pt, b: Pt) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);

export function AvatarCropper({ uri, onCancel, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  // Положение «как на экране»: quarter — повороты по 90° по часовой (может быть отрицательным), fx/fy — отражения (−1 = отражено).
  // Отражения считаются в осях экрана, поэтому «влево-вправо» всегда значит влево-вправо, как бы фото ни было повёрнуто
  const [quarter, setQuarter] = useState(0);
  const orient = useRef({ fx: 1, fy: 1 }).current;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => alive && setNatural({ w, h }),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [uri]);

  // Размеры после поворота и диаметр рамки
  const odd = Math.abs(quarter) % 2 === 1;
  const iw = natural?.w ?? 1;
  const ih = natural?.h ?? 1;
  const w = odd ? ih : iw;
  const h = odd ? iw : ih;
  const D = Math.max(120, Math.min(stage.w - 40, stage.h - 32));
  const base = natural ? baseScale(w, h, D) : 1;

  // Текущее положение: настоящие числа (cur) и их «живые» копии для рисования
  const cur = useRef({ x: 0, y: 0, z: 1 });
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const flipX = useRef(new Animated.Value(1)).current;
  const flipY = useRef(new Animated.Value(1)).current;
  const dims = useRef({ w, h, D });
  dims.current = { w, h, D };

  const show = (x: number, y: number, z: number) => {
    const { w: cw, h: ch, D: cd } = dims.current;
    const zz = z < 1 ? 1 - (1 - z) * 0.4 : z > MAX_ZOOM ? MAX_ZOOM + (z - MAX_ZOOM) * 0.2 : z;
    const limit = maxOffset(cw, ch, cd, clampZoom(zz));
    tx.setValue(rubberBand(x, limit.x));
    ty.setValue(rubberBand(y, limit.y));
    zoom.setValue(zz);
  };

  // Мягко возвращает фото на место, если его утянули за край или слишком приблизили/отдалили
  const settle = (target?: { x: number; y: number; z: number }, quickMs?: number) => {
    const { w: cw, h: ch, D: cd } = dims.current;
    const z = clampZoom(target ? target.z : cur.current.z);
    const o = clampOffset(target ? target : cur.current, cw, ch, cd, z);
    cur.current = { x: o.x, y: o.y, z };
    // quickMs — короткая плавная подгонка по времени (кнопки «+» и «−»); без него — мягкая пружина
    const spring = (value: Animated.Value, to: number) =>
      reduceMotion
        ? value.setValue(to)
        : quickMs
          ? Animated.timing(value, { toValue: to, duration: quickMs, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
          : Animated.spring(value, { toValue: to, stiffness: 260, damping: 28, mass: 1, useNativeDriver: false }).start();
    spring(tx, o.x);
    spring(ty, o.y);
    spring(zoom, z);
  };

  const gesture = useRef({ count: 0, x: 0, y: 0, z: 1, dist: 1, mx: 0, my: 0, startedAt: 0, moved: 0, lastTap: 0 }).current;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          gesture.count = 0;
          gesture.startedAt = Date.now();
          gesture.moved = 0;
        },
        onPanResponderMove: (event) => {
          const t = event.nativeEvent.touches as unknown as Pt[];
          if (t.length === 0) return;
          const a = t[0] as Pt;
          const b = (t[1] ?? a) as Pt;
          const mx = (a.pageX + b.pageX) / 2;
          const my = (a.pageY + b.pageY) / 2;
          // Число пальцев изменилось — начинаем отсчёт заново, чтобы фото не прыгало
          if (t.length !== gesture.count) {
            gesture.count = t.length;
            gesture.x = cur.current.x;
            gesture.y = cur.current.y;
            gesture.z = cur.current.z;
            gesture.dist = t.length > 1 ? Math.max(1, dist(a, b)) : 1;
            gesture.mx = mx;
            gesture.my = my;
            return;
          }
          const ratio = t.length > 1 ? dist(a, b) / gesture.dist : 1;
          const z = Math.min(MAX_ZOOM * 1.4, Math.max(0.6, gesture.z * ratio));
          const x = gesture.x * ratio + (mx - gesture.mx);
          const y = gesture.y * ratio + (my - gesture.my);
          gesture.moved = Math.max(gesture.moved, Math.hypot(mx - gesture.mx, my - gesture.my));
          cur.current = { x, y, z };
          show(x, y, z);
        },
        onPanResponderRelease: () => {
          const tapped = gesture.moved < 6 && Date.now() - gesture.startedAt < 250 && gesture.count <= 1;
          if (tapped) {
            const now = Date.now();
            if (now - gesture.lastTap < DOUBLE_TAP_MS) {
              gesture.lastTap = 0;
              const z = cur.current.z > 1.2 ? 1 : 2.5;
              const ratio = z / Math.max(cur.current.z, 0.01);
              settle({ x: cur.current.x * ratio, y: cur.current.y * ratio, z });
              return;
            }
            gesture.lastTap = now;
          }
          settle();
        },
        onPanResponderTerminate: () => settle(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Браузер: колёсико мыши приближает и отдаляет
  const stageRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = stageRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const ratio = Math.exp(-event.deltaY * 0.0025);
      const z = Math.min(MAX_ZOOM * 1.2, Math.max(0.8, cur.current.z * ratio));
      cur.current = { x: cur.current.x * (z / cur.current.z), y: cur.current.y * (z / cur.current.z), z };
      show(cur.current.x, cur.current.y, z);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => settle(), 160);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.w, natural]);

  // ——— Масштаб кнопками и ползунком. Все три способа (кнопки, ползунок, два пальца) меняют одно и то же число,
  // поэтому ползунок всегда показывает текущий масштаб. Масштаб растёт от центра круга: сдвиг фото меняется пропорционально
  const STEP = 1.15;
  const [limit, setLimit] = useState<'min' | 'max' | 'mid'>('min');
  useEffect(() => {
    const id = zoom.addListener(({ value }) => setLimit(value <= 1.001 ? 'min' : value >= MAX_ZOOM - 0.001 ? 'max' : 'mid'));
    return () => zoom.removeListener(id);
  }, [zoom]);

  const zoomTo = (z: number, quickMs?: number) => {
    const target = clampZoom(z);
    const ratio = target / Math.max(cur.current.z, 0.01);
    settle({ x: cur.current.x * ratio, y: cur.current.y * ratio, z: target }, quickMs);
  };
  const stepOnce = (dir: 1 | -1) => zoomTo(dir === 1 ? cur.current.z * STEP : cur.current.z / STEP, 200);

  // Удержание кнопки: через 350 мс масштаб меняется непрерывно, пока кнопка нажата
  const hold = useRef<{ delay: ReturnType<typeof setTimeout> | null; tick: ReturnType<typeof setInterval> | null; held: boolean }>({ delay: null, tick: null, held: false }).current;
  const stopHold = () => {
    if (hold.delay) clearTimeout(hold.delay);
    if (hold.tick) clearInterval(hold.tick);
    hold.delay = null;
    hold.tick = null;
    if (hold.held) settle();
  };
  const startHold = (dir: 1 | -1) => {
    hold.held = false;
    hold.delay = setTimeout(() => {
      hold.held = true;
      hold.tick = setInterval(() => {
        const z = clampZoom(cur.current.z * (dir === 1 ? 1.035 : 1 / 1.035));
        const ratio = z / Math.max(cur.current.z, 0.01);
        cur.current = { x: cur.current.x * ratio, y: cur.current.y * ratio, z };
        show(cur.current.x, cur.current.y, z);
      }, 30);
    }, 350);
  };
  useEffect(() => () => stopHold(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const animate = (value: Animated.Value, to: number) =>
    reduceMotion ? value.setValue(to) : Animated.timing(value, { toValue: to, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

  // Сбросить: поворот, отражения, приближение и положение — как в начале
  const reset = () => {
    setQuarter(0);
    orient.fx = 1;
    orient.fy = 1;
    dims.current = { w: iw, h: ih, D };
    animate(rot, 0);
    animate(flipX, 1);
    animate(flipY, 1);
    settle({ x: 0, y: 0, z: 1 });
  };

  // Поворот на 90°: dir = 1 по часовой, −1 против. Если фото уже отражено (одно отражение), направление поворота
  // в осях фото меняется на обратное, а на экране поворот остаётся тем же, какой нарисован на кнопке
  const turn = (dir: 1 | -1) => {
    const mirrored = orient.fx * orient.fy < 0;
    const next = quarter + (mirrored ? -dir : dir);
    setQuarter(next);
    dims.current = Math.abs(next) % 2 === 1 ? { w: ih, h: iw, D } : { w: iw, h: ih, D };
    animate(rot, next * 90);
    // Положение фото поворачивается вместе с ним, потом подгоняется под новые границы
    const { x, y, z } = cur.current;
    settle({ x: dir === 1 ? -y : y, y: dir === 1 ? x : -x, z });
  };

  // Отразить: horizontal — слева направо, иначе сверху вниз. Положение зеркалится вместе с фото
  const flip = (axis: 'horizontal' | 'vertical') => {
    const { x, y, z } = cur.current;
    if (axis === 'horizontal') {
      orient.fx *= -1;
      animate(flipX, orient.fx);
      settle({ x: -x, y, z });
    } else {
      orient.fy *= -1;
      animate(flipY, orient.fy);
      settle({ x, y: -y, z });
    }
  };

  const done = async () => {
    if (!natural || busy) return;
    setBusy(true);
    try {
      const z = clampZoom(cur.current.z);
      const o = clampOffset(cur.current, w, h, D, z);
      const rect = cropRect(w, h, D, z, o);
      const actions: ImageManipulator.Action[] = [];
      // Порядок как на экране: сначала поворот, потом отражения в осях экрана
      const turned = (((quarter % 4) + 4) % 4) * 90;
      if (turned !== 0) actions.push({ rotate: turned });
      if (orient.fx < 0) actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      if (orient.fy < 0) actions.push({ flip: ImageManipulator.FlipType.Vertical });
      actions.push({ crop: { originX: rect.originX, originY: rect.originY, width: rect.size, height: rect.size } });
      actions.push({ resize: { width: outputSize(rect.size), height: outputSize(rect.size) } });
      const result = await ImageManipulator.manipulateAsync(uri, actions, { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      onDone(result.uri);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  const cx = stage.w / 2;
  const cy = stage.h / 2;
  const rotate90 = rot.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const ready = natural !== null && stage.w > 0;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Отмена" hitSlop={10} onPress={onCancel} disabled={busy} style={styles.side}>
            <Text style={[type.body, { color: C.muted }]}>Отмена</Text>
          </Pressable>
          <Text accessibilityRole="header" style={[type.headline, styles.title, { color: C.text }]}>
            Фото профиля
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Готово" accessibilityState={{ disabled: !ready || busy }} hitSlop={10} onPress={() => void done()} disabled={!ready || busy} style={[styles.side, styles.right]}>
            {busy ? <ActivityIndicator color={C.text} /> : <Text style={[type.body, styles.done, { color: C.text, opacity: ready ? 1 : 0.35 }]}>Готово</Text>}
          </Pressable>
        </View>

        <View ref={stageRef} style={styles.stage} onLayout={(event) => setStage({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height })} {...pan.panHandlers}>
          {ready ? (
            <>
              <Animated.Image
                source={{ uri }}
                resizeMode="cover"
                style={{
                  position: 'absolute',
                  width: iw * base,
                  height: ih * base,
                  left: cx - (iw * base) / 2,
                  top: cy - (ih * base) / 2,
                  transform: [{ translateX: tx }, { translateY: ty }, { scale: zoom }, { scaleX: flipX }, { scaleY: flipY }, { rotate: rotate90 }],
                }}
              />
              {/* Затемнение снаружи круга: тёмный слой с круглым «окном» */}
              <Svg pointerEvents="none" width={stage.w} height={stage.h} style={StyleSheet.absoluteFill}>
                <Defs>
                  <Mask id="hole">
                    <Rect width={stage.w} height={stage.h} fill="white" />
                    <Circle cx={cx} cy={cy} r={D / 2} fill="black" />
                  </Mask>
                </Defs>
                <Rect width={stage.w} height={stage.h} fill={C.background} fillOpacity={0.74} mask="url(#hole)" />
                <Circle cx={cx} cy={cy} r={D / 2} fill="none" stroke={C.text} strokeOpacity={0.55} strokeWidth={1} />
              </Svg>
            </>
          ) : failed ? (
            <Text style={[type.body, styles.message, { color: C.muted }]}>Не получилось открыть фото. Выберите другое</Text>
          ) : (
            <ActivityIndicator color={C.text} />
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.zoomRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Уменьшить"
              accessibilityState={{ disabled: limit === 'min' }}
              disabled={!ready || busy || limit === 'min'}
              hitSlop={6}
              onPressIn={() => startHold(-1)}
              onPressOut={stopHold}
              onPress={() => (hold.held ? (hold.held = false) : stepOnce(-1))}
              style={[styles.zoomButton, { opacity: limit === 'min' ? 0.3 : 1 }]}
            >
              <MinusIcon color={C.text} size={16} />
            </Pressable>
            <ZoomSlider zoom={zoom} disabled={!ready || busy} onChange={(z) => zoomTo(z)} onLive={(z) => {
              const clamped = Math.min(MAX_ZOOM, Math.max(1, z));
              const ratio = clamped / Math.max(cur.current.z, 0.01);
              cur.current = { x: cur.current.x * ratio, y: cur.current.y * ratio, z: clamped };
              show(cur.current.x, cur.current.y, clamped);
            }} onEnd={() => settle()} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Увеличить"
              accessibilityState={{ disabled: limit === 'max' }}
              disabled={!ready || busy || limit === 'max'}
              hitSlop={6}
              onPressIn={() => startHold(1)}
              onPressOut={stopHold}
              onPress={() => (hold.held ? (hold.held = false) : stepOnce(1))}
              style={[styles.zoomButton, { opacity: limit === 'max' ? 0.3 : 1 }]}
            >
              <PlusIcon color={C.text} size={16} />
            </Pressable>
          </View>
          <View style={styles.tools}>
            <Pressable accessibilityRole="button" accessibilityLabel="Повернуть на 90 градусов против часовой стрелки" hitSlop={6} onPress={() => turn(-1)} disabled={!ready || busy} style={styles.tool}>
              <RotateLeftIcon color={C.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Повернуть на 90 градусов по часовой стрелке" hitSlop={6} onPress={() => turn(1)} disabled={!ready || busy} style={styles.tool}>
              <RotateRightIcon color={C.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Отразить по горизонтали" hitSlop={6} onPress={() => flip('horizontal')} disabled={!ready || busy} style={styles.tool}>
              <FlipHorizontalIcon color={C.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Отразить по вертикали" hitSlop={6} onPress={() => flip('vertical')} disabled={!ready || busy} style={styles.tool}>
              <FlipVerticalIcon color={C.text} />
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Сбросить" hitSlop={10} onPress={reset} disabled={!ready || busy} style={styles.reset}>
            <Text style={[type.subhead, { color: C.muted }]}>Сбросить</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Тонкий ползунок масштаба: положение берётся из того же числа, что и у жеста и кнопок, поэтому всегда верное.
// Тянуть можно за любое место полосы
function ZoomSlider({ zoom, disabled, onChange, onLive, onEnd }: { zoom: Animated.Value; disabled: boolean; onChange: (z: number) => void; onLive: (z: number) => void; onEnd: () => void }) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  widthRef.current = width;
  const handlers = useRef({ onChange, onLive, onEnd });
  handlers.current = { onChange, onLive, onEnd };
  // Кружок ползунка (22 px) целиком помещается в полосу: крайние положения — на 11 px от краёв
  const fromX = (x: number) => 1 + Math.min(1, Math.max(0, (x - 11) / Math.max(widthRef.current - 22, 1))) * (MAX_ZOOM - 1);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => handlers.current.onLive(fromX(event.nativeEvent.locationX)),
        onPanResponderMove: (event) => handlers.current.onLive(fromX(event.nativeEvent.locationX)),
        onPanResponderRelease: () => handlers.current.onEnd(),
        onPanResponderTerminate: () => handlers.current.onEnd(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled],
  );
  const fill = zoom.interpolate({ inputRange: [1, MAX_ZOOM], outputRange: [11, Math.max(width - 11, 12)], extrapolate: 'clamp' });
  const knob = zoom.interpolate({ inputRange: [1, MAX_ZOOM], outputRange: [0, Math.max(width - 22, 1)], extrapolate: 'clamp' });
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Масштаб"
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => onChange(event.nativeEvent.actionName === 'increment' ? 1.15 * (zoomValue(zoom) || 1) : (zoomValue(zoom) || 1) / 1.15)}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.sliderHit}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={[styles.sliderTrack, { backgroundColor: C.border }]}>
        <Animated.View style={[styles.sliderFill, { width: fill, backgroundColor: C.text }]} />
      </View>
      <Animated.View pointerEvents="none" style={[styles.sliderKnob, { backgroundColor: C.text, transform: [{ translateX: knob }] }]} />
    </View>
  );
}

// Текущее значение анимированного числа (нужно только для действий доступности)
function zoomValue(value: Animated.Value): number {
  return (value as unknown as { __getValue: () => number }).__getValue();
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16 },
  side: { minWidth: 72, minHeight: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center' },
  done: { fontWeight: '700' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  message: { textAlign: 'center', paddingHorizontal: 32 },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch', paddingHorizontal: 12, paddingBottom: 6 },
  zoomButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sliderHit: { flex: 1, height: 40, justifyContent: 'center' },
  sliderTrack: { height: 3, borderRadius: 1.5, overflow: 'hidden' },
  sliderFill: { height: 3 },
  sliderKnob: { position: 'absolute', left: 0, top: 9, width: 22, height: 22, borderRadius: 11 },
  footer: { minHeight: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  tools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tool: { width: 52, height: 48, alignItems: 'center', justifyContent: 'center' },
  reset: { position: 'absolute', left: 16, bottom: 2, minHeight: 44, justifyContent: 'center' },
});
