import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseIcon } from '../../../ui/icons';
import { darkColors, radius, type, useReduceMotion } from '../../../ui/theme';
import { AdPhoto } from '../AdPhoto';
import type { Ad } from '../ads';

const D = darkColors;

// Фото объявления сверху: квадрат на всю ширину, листается свайпом, внизу точки и «1/5»; нажатие — полноэкранный просмотр.
// Без фото — спокойная заглушка с иконкой типа.
export function AdGallery({ ad, size, onIndexChange }: { ad: Ad; size: number; onIndexChange?: (index: number) => void }) {
  const photos = ad.photos;
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);

  if (photos.length === 0) return <AdPhoto ad={ad} style={{ width: size, height: size }} iconScale={3} />;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.max(0, Math.min(photos.length - 1, Math.round(event.nativeEvent.contentOffset.x / size)));
    if (next !== index) {
      setIndex(next);
      onIndexChange?.(next);
    }
  };

  return (
    <View style={{ width: size, height: size }}>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, i) => `${i}:${uri.slice(-24)}`}
        getItemLayout={(_, i) => ({ length: size, offset: size * i, index: i })}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index: i }) => (
          <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Фото ${i + 1} из ${photos.length}. Открыть на весь экран`} onPress={() => setViewer(i)}>
            <Image source={{ uri: item }} resizeMode="cover" style={{ width: size, height: size }} />
          </Pressable>
        )}
      />
      {photos.length > 1 ? (
        <>
          <View pointerEvents="none" style={styles.dots}>
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: D.text, opacity: i === index ? 1 : 0.4 }]} />
            ))}
          </View>
          <View pointerEvents="none" style={[styles.counter, { backgroundColor: D.scrim }]}>
            <Text style={[type.footnote, { color: D.text }]}>
              {index + 1}/{photos.length}
            </Text>
          </View>
        </>
      ) : null}
      <PhotoViewer photos={photos} start={viewer} onClose={() => setViewer(null)} />
    </View>
  );
}

// Полноэкранный просмотр: тёмный фон, листание, двойное нажатие и «щипок» увеличивают, свайп вниз закрывает
function PhotoViewer({ photos, start, onClose }: { photos: string[]; start: number | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const fade = useRef(new Animated.Value(1)).current;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (start !== null) {
      setIndex(start);
      fade.setValue(1);
    }
  }, [start, fade]);

  if (start === null) return null;
  return (
    <Modal visible transparent animationType={reduceMotion ? 'none' : 'fade'} statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.viewer, { backgroundColor: D.background, opacity: fade }]} onLayout={(event) => setSize({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height })}>
        {size.w > 0 ? (
          <FlatList
            ref={listRef}
            data={photos}
            horizontal
            pagingEnabled
            initialScrollIndex={start}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, i) => `${i}:${uri.slice(-24)}`}
            getItemLayout={(_, i) => ({ length: size.w, offset: size.w * i, index: i })}
            onScroll={(event) => setIndex(Math.max(0, Math.min(photos.length - 1, Math.round(event.nativeEvent.contentOffset.x / size.w))))}
            scrollEventThrottle={16}
            renderItem={({ item }) => <ZoomPage uri={item} w={size.w} h={size.h} fade={fade} onClose={onClose} />}
          />
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть" onPress={onClose} hitSlop={8} style={[styles.viewerClose, { top: insets.top + 8 }]}>
          <CloseIcon color={D.text} size={20} />
        </Pressable>
        {photos.length > 1 ? (
          <View pointerEvents="none" style={[styles.viewerCount, { bottom: insets.bottom + 16 }]}>
            <Text style={[type.footnote, { color: D.text }]}>
              {index + 1}/{photos.length}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

type Pt = { pageX: number; pageY: number };
const dist = (a: Pt, b: Pt) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);

function ZoomPage({ uri, w, h, fade, onClose }: { uri: string; w: number; h: number; fade: Animated.Value; onClose: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const cur = useRef({ s: 1, x: 0, y: 0 });
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);

  const apply = (s: number, x: number, y: number) => {
    cur.current = { s, x, y };
    scale.setValue(s);
    tx.setValue(x);
    ty.setValue(y);
  };
  const settle = (s: number, x: number, y: number) => {
    cur.current = { s, x, y };
    const spring = (v: Animated.Value, to: number) => Animated.spring(v, { toValue: to, stiffness: 300, damping: 30, mass: 1, useNativeDriver: false }).start();
    spring(scale, s);
    spring(tx, x);
    spring(ty, y);
  };
  const limit = (s: number) => ({ x: Math.max(0, (w * s - w) / 2), y: Math.max(0, (h * s - h) / 2) });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => (event.nativeEvent.touches?.length ?? 0) === 2,
      // «Capture» — чтобы забрать жест у вложенного нажатия (двойное нажатие), как только палец или мышь пошли вниз или щипок
      onMoveShouldSetPanResponderCapture: (event, g) => (event.nativeEvent.touches?.length ?? 0) === 2 || cur.current.s > 1.01 || (g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6),
      onMoveShouldSetPanResponder: (event, g) => (event.nativeEvent.touches?.length ?? 0) === 2 || cur.current.s > 1.01 || (g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6),
      onPanResponderGrant: () => {
        start.current = { x: cur.current.x, y: cur.current.y };
        pinch.current = null;
      },
      onPanResponderMove: (event, g) => {
        // У мыши нет списка касаний — тогда это не «щипок»
        const touches = (event.nativeEvent.touches ?? []) as unknown as Pt[];
        if (touches.length === 2) {
          const d = dist(touches[0] as Pt, touches[1] as Pt);
          if (!pinch.current) pinch.current = { d, s: cur.current.s };
          const s = Math.max(0.8, Math.min(5, (pinch.current.s * d) / pinch.current.d));
          apply(s, cur.current.x, cur.current.y);
          return;
        }
        if (cur.current.s > 1.01) {
          const lim = limit(cur.current.s);
          apply(cur.current.s, Math.max(-lim.x, Math.min(lim.x, start.current.x + g.dx)), Math.max(-lim.y, Math.min(lim.y, start.current.y + g.dy)));
        } else {
          // Тянем вниз, чтобы закрыть: фото уезжает, фон бледнеет
          ty.setValue(g.dy);
          fade.setValue(Math.max(0.2, 1 - Math.abs(g.dy) / 360));
        }
      },
      onPanResponderRelease: (_event, g) => {
        pinch.current = null;
        if (cur.current.s <= 1.01 && g.dy > 110) {
          onClose();
          return;
        }
        Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: false }).start();
        if (cur.current.s < 1) settle(1, 0, 0);
        else if (cur.current.s <= 1.01) settle(1, 0, 0);
        else {
          const lim = limit(cur.current.s);
          settle(cur.current.s, Math.max(-lim.x, Math.min(lim.x, cur.current.x)), Math.max(-lim.y, Math.min(lim.y, cur.current.y)));
        }
      },
      onPanResponderTerminate: () => {
        pinch.current = null;
        settle(Math.max(1, cur.current.s), cur.current.s > 1 ? cur.current.x : 0, cur.current.s > 1 ? cur.current.y : 0);
      },
    }),
  ).current;

  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      if (cur.current.s > 1.01) settle(1, 0, 0);
      else settle(2.5, 0, 0);
    } else lastTap.current = now;
  };

  // В браузере — колёсико мыши
  const wheel = Platform.OS === 'web' ? ({ onWheel: (event: { deltaY: number }) => settle(Math.max(1, Math.min(5, cur.current.s * (event.deltaY < 0 ? 1.15 : 1 / 1.15))), 0, 0) } as object) : null;

  return (
    <View style={{ width: w, height: h }} {...pan.panHandlers} {...wheel}>
      <Pressable accessibilityLabel="Двойное нажатие — приблизить" onPress={tap} style={StyleSheet.absoluteFill}>
        <Animated.Image source={{ uri }} resizeMode="contain" style={{ width: w, height: h, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  counter: { position: 'absolute', right: 12, bottom: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.control },
  viewer: { flex: 1 },
  viewerClose: { position: 'absolute', right: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewerCount: { position: 'absolute', alignSelf: 'center' },
});
