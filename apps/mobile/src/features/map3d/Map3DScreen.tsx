import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Segmented } from '../../ui/Segmented';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { createControls, type MapMode } from './controls';
import { STICK_RADIUS, createGestures, type StickView } from './gestures';
import { zoomOrbit } from './orbit';
import { Scene } from './Scene';
import { onMiniMap, placeAt, type Place } from './places';
import {
  CHURCH_VIEW,
  CORRIDOR2_VIEW,
  CORRIDOR_VIEW,
  CUBE_VIEW,
  EAST_VIEW,
  FLOOR2_VIEW,
  FLOOR3_VIEW,
  FLOOR4_VIEW,
  HALL_VIEW,
  KORP_L_VIEW,
  MODEL_VERSION,
  NORTH_A_VIEW,
  NORTH_L_VIEW,
  NORTH_N_VIEW,
  STAIRS_VIEW,
  PITCH_VIEW,
  START,
  canStand,
} from './terrain';
import type { Vec2 } from './types';

const MODES = [
  { value: 'walk', label: 'Прогулка' },
  { value: 'top', label: 'Сверху' },
] as const;

const PLACES = [
  { title: 'Ко входу', where: START },
  { title: 'В холл', where: HALL_VIEW },
  { title: 'В коридор', where: CORRIDOR_VIEW },
  { title: 'К лестнице', where: STAIRS_VIEW },
  { title: 'На 2 этаж', where: FLOOR2_VIEW },
  { title: 'Коридор 2 этажа', where: CORRIDOR2_VIEW },
  { title: 'На 3 этаж', where: FLOOR3_VIEW },
  { title: 'На 4 этаж', where: FLOOR4_VIEW },
  { title: 'Корпус С', where: EAST_VIEW },
  { title: 'Корпус А', where: NORTH_A_VIEW },
  { title: 'Корпус Н', where: NORTH_N_VIEW },
  { title: 'Библиотека', where: NORTH_L_VIEW },
  { title: 'Корпус Л', where: KORP_L_VIEW },
  { title: 'К полю', where: PITCH_VIEW },
  { title: 'К церкви', where: CHURCH_VIEW },
  { title: 'К кубу', where: CUBE_VIEW },
];

const HINT: Record<MapMode, string> = {
  walk: Platform.OS === 'web' ? 'Слева — идти, справа — осматриваться. На клавиатуре: W A S D и стрелки' : 'Слева — идти, справа — осматриваться',
  top: 'Нажмите на место на карте, чтобы пройтись там',
};

export function Map3DScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const controls = useMemo(createControls, []);
  const [mode, setMode] = useState<MapMode>(controls.mode);
  const [stick, setStick] = useState<StickView>(null);
  const [note, setNote] = useState<string | null>(null);
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const view = useRef({ width: 1, height: 1 });
  // «Где я»: место, точка и направление взгляда для подсказки и мини-карты. Обновляется 5 раз в секунду, а не каждый кадр
  const [here, setHere] = useState<{ place: Place; x: number; y: number; yaw: number }>(() => {
    const place = placeAt(controls.position, 0);
    return { place, ...onMiniMap(place.map, controls.position), yaw: controls.yaw };
  });
  useEffect(() => {
    const timer = setInterval(() => {
      const place = placeAt(controls.position, controls.feet);
      const spot = onMiniMap(place.map, controls.position);
      setHere((old) =>
        old.place.label === place.label && Math.abs(old.x - spot.x) < 0.004 && Math.abs(old.y - spot.y) < 0.004 && Math.abs(old.yaw - controls.yaw) < 0.03
          ? old
          : { place, ...spot, yaw: controls.yaw },
      );
    }, 200);
    return () => clearInterval(timer);
  }, [controls]);
  const shift = useRef(false);

  const gestures = useMemo(
    () =>
      createGestures(controls, {
        onStick: setStick,
        onTap: (x, y) => {
          const point = controls.pick?.(x, y);
          if (!point) return;
          if (!canStand(point)) {
            setNote('Сюда пока нельзя: выберите место на улице внутри территории');
            return;
          }
          setNote(null);
          controls.position = point;
          controls.snapHeight = 0;
          controls.yaw = controls.orbit.azimuth;
          controls.pitch = 0;
          controls.mode = 'walk';
          setMode('walk');
        },
      }),
    [controls],
  );

  // Быстрый перенос в известное место: сразу в «Прогулку», лицом к цели
  const goTo = (place: { position: Vec2; yaw: number; pitch?: number; height?: number }) => {
    gestures.reset();
    setNote(null);
    controls.position = { ...place.position };
    controls.snapHeight = place.height ?? 0;
    controls.yaw = place.yaw;
    controls.pitch = place.pitch ?? 0;
    controls.mode = 'walk';
    setMode('walk');
  };

  const changeMode = (next: MapMode) => {
    if (next === controls.mode) return;
    gestures.reset();
    setNote(null);
    if (next === 'top') {
      // Камера поднимается над тем местом, где человек стоял
      controls.orbit = { x: controls.position.x, z: controls.position.z, distance: 230, azimuth: controls.yaw, tilt: 0.95 };
    }
    controls.mode = next;
    setMode(next);
  };

  // В браузере на компьютере: клавиатура для ходьбы, колесо для приближения, Shift + мышь — поворот и наклон
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const down = (event: KeyboardEvent) => {
      shift.current = event.shiftKey;
      controls.keys.add(event.code);
    };
    const up = (event: KeyboardEvent) => {
      shift.current = event.shiftKey;
      controls.keys.delete(event.code);
    };
    const wheel = (event: WheelEvent) => {
      if (controls.mode === 'top') controls.orbit = zoomOrbit(controls.orbit, Math.exp(-event.deltaY * 0.0015));
    };
    const blur = () => controls.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', blur);
    };
  }, [controls]);

  // Только при разработке в браузере: доступ к управлению из консоли, чтобы ставить камеру в точку для проверки
  useEffect(() => {
    if (__DEV__ && Platform.OS === 'web') (globalThis as { __map3d?: unknown }).__map3d = controls;
  }, [controls]);

  const onLayout = (event: LayoutChangeEvent) => {
    view.current = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height };
  };
  const onTouch = (event: GestureResponderEvent) => {
    gestures.handle(event.nativeEvent.touches, view.current, Date.now(), shift.current);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Scene controls={controls} reduceMotion={reduceMotion} onReady={() => setLoad('ready')} onError={() => setLoad('error')} />
      </View>

      {/* Один слой ловит все пальцы сразу: так джойстик и поворот головы работают одновременно */}
      <View
        style={StyleSheet.absoluteFill}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={onTouch}
        onResponderStart={onTouch}
        onResponderMove={onTouch}
        onResponderEnd={onTouch}
        onResponderRelease={onTouch}
        onResponderTerminate={() => gestures.reset()}
        accessibilityLabel={mode === 'walk' ? 'Трёхмерная карта, режим прогулки' : 'Трёхмерная карта, вид сверху'}
      />

      {mode === 'walk' ? (
        <View
          pointerEvents="none"
          style={[
            styles.stick,
            { borderColor: colors.glassBorder, backgroundColor: colors.glassTint },
            stick ? { left: stick.originX - STICK_RADIUS, top: stick.originY - STICK_RADIUS, opacity: 1 } : { left: insets.left + 28, bottom: insets.bottom + 96, opacity: 0.55 },
          ]}
        >
          <View style={[styles.knob, { backgroundColor: colors.card, shadowColor: colors.shadow }, stick && { transform: [{ translateX: stick.knobX }, { translateY: stick.knobY }] }]} />
        </View>
      ) : null}

      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.switch}>
          <Segmented options={MODES} value={mode} onChange={changeMode} />
        </View>
        <View style={styles.places}>
          {PLACES.map((place) => (
            <Pressable
              key={place.title}
              accessibilityRole="button"
              accessibilityLabel={`Перейти: ${place.title}`}
              onPress={() => goTo(place.where)}
              style={({ pressed }) => [styles.place, { backgroundColor: colors.card, opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[type.footnote, styles.placeText, { color: colors.text }]}>{place.title}</Text>
            </Pressable>
          ))}
        </View>
        {mode === 'walk' && load === 'ready' ? (
          <View pointerEvents="none" accessibilityLabel={`Вы здесь: ${here.place.label}`} style={[styles.where, { backgroundColor: colors.card }]}>
            <Text style={[type.footnote, styles.placeText, { color: colors.text }]}>{here.place.label}</Text>
          </View>
        ) : null}
        <View pointerEvents="none" style={[styles.pill, { backgroundColor: colors.glassTint }]}>
          <Text style={[type.footnote, { color: colors.text }]}>
            {load === 'loading' ? 'Загружаем карту…' : load === 'error' ? 'Не получилось загрузить карту. Проверьте интернет' : (note ?? HINT[mode])}
          </Text>
        </View>
      </View>

      {mode === 'walk' && load === 'ready' ? (
        <View
          pointerEvents="none"
          accessibilityLabel="Мини-карта"
          style={[styles.mini, { width: MINI_WIDTH, height: (MINI_WIDTH * here.place.map.height) / here.place.map.width, bottom: insets.bottom + 100, right: insets.right + 12, borderColor: colors.glassBorder }]}
        >
          <Image source={{ uri: `/map3d/${here.place.map.file}?v=${MODEL_VERSION}` }} style={StyleSheet.absoluteFill} resizeMode="stretch" />
          <View style={[styles.me, { left: `${here.x * 100}%`, top: `${here.y * 100}%`, transform: [{ translateX: -9 }, { translateY: -9 }, { rotate: `${here.yaw}rad` }] }]}>
            <View style={styles.meArrow} />
            <View style={styles.meDot} />
          </View>
        </View>
      ) : null}

      <View pointerEvents="none" style={[styles.source, { bottom: insets.bottom + 6, right: insets.right + 10 }]}>
        <Text style={[styles.sourceText, { color: colors.muted }]}>© участники OpenStreetMap</Text>
      </View>
    </View>
  );
}

const MINI_WIDTH = 132;

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  switch: { width: '100%', maxWidth: 320 },
  places: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  place: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  placeText: { fontWeight: '600' },
  where: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  mini: { position: 'absolute', borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, backgroundColor: '#eee' },
  me: { position: 'absolute', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  meDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e02424', borderWidth: 1.5, borderColor: '#fff' },
  meArrow: {
    position: 'absolute',
    top: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#e02424',
  },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, maxWidth: 360 },
  stick: {
    position: 'absolute',
    width: STICK_RADIUS * 2,
    height: STICK_RADIUS * 2,
    borderRadius: STICK_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: { width: 52, height: 52, borderRadius: 26, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  source: { position: 'absolute' },
  sourceText: { fontSize: 11, lineHeight: 14 },
});
