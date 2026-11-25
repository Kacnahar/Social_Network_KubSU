import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { CommentIcon, HeartIcon, ShareIcon } from './icons';
import { useSound } from './soundStore';
import { type, useColors, useReduceMotion } from './theme';

// Кнопки под постом и под комментарием: «нравится», «комментарии», «поделиться».
// Везде одинаковые: линия 1,8 px, размер 22 (в комментариях 18), область нажатия не меньше 44 px.

const native = Platform.OS !== 'web';
const PARTICLES = 6;

// Счётчик: при изменении старая цифра уезжает, новая выезжает (вверх при росте, вниз при уменьшении)
export function AnimatedCount({ value, color, small = false }: { value: number; color: string; small?: boolean }) {
  const reduceMotion = useReduceMotion();
  const style = small ? type.footnote : type.subhead;
  const height = style.lineHeight;
  const text = value > 0 ? String(value) : '';
  const [shown, setShown] = useState({ now: text, before: text });
  const progress = useRef(new Animated.Value(1)).current;
  const direction = useRef(1);
  const last = useRef(value);

  useEffect(() => {
    if (last.current === value) return;
    direction.current = value > last.current ? 1 : -1;
    last.current = value;
    setShown((old) => ({ now: text, before: old.now }));
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [value, text, reduceMotion, progress]);

  const dir = direction.current;
  const nowY = progress.interpolate({ inputRange: [0, 1], outputRange: [dir * height, 0] });
  const beforeY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -dir * height] });
  const beforeOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View style={{ height, overflow: 'hidden', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no">
      {/* Невидимая копия задаёт ширину */}
      <Text style={[style, styles.count, { color, opacity: 0 }]}>{shown.now}</Text>
      <Animated.Text style={[style, styles.count, styles.layer, { color, transform: [{ translateY: nowY }] }]}>{shown.now}</Animated.Text>
      <Animated.Text style={[style, styles.count, styles.layer, { color, opacity: beforeOpacity, transform: [{ translateY: beforeY }] }]}>
        {shown.before}
      </Animated.Text>
    </View>
  );
}

type PressableAction = {
  label: string;
  role?: 'button' | 'switch' | 'text';
  checked?: boolean;
  onPress?: () => void;
  size?: number;
  children: (scale: Animated.Value) => ReactNode;
  count?: number;
  countColor: string;
};

// Общая оболочка: «нажим» в момент касания, область нажатия 44 px за счёт hitSlop
function ActionShell({ label, role = 'button', checked, onPress, size = 22, children, count, countColor }: PressableAction) {
  const reduceMotion = useReduceMotion();
  const press = useRef(new Animated.Value(1)).current;
  const small = size < 20;
  const slop = Math.ceil((44 - size) / 2);

  const animatePress = (down: boolean) => {
    if (reduceMotion || !onPress) return;
    Animated.spring(press, { toValue: down ? 0.82 : 1, speed: 50, bounciness: down ? 0 : 8, useNativeDriver: native }).start();
  };

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'switch' ? { checked } : undefined}
      disabled={!onPress}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      onPress={onPress}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
      style={styles.action}
    >
      <Animated.View style={{ transform: [{ scale: press }] }}>{children(press)}</Animated.View>
      {count !== undefined ? <AnimatedCount value={count} color={countColor} small={small} /> : null}
    </Pressable>
  );
}

type LikeProps = {
  liked: boolean;
  count: number;
  // Нет onPress (гость) — сердце только показывает счёт
  onPress?: () => void;
  size?: number;
  // Нужно ли показывать счётчик, когда лайков нет (в комментариях пусто)
  label?: string;
};

// Сердце: при лайке сжимается и подпрыгивает, вокруг короткая вспышка; при снятии — тихо
export function LikeButton({ liked, count, onPress, size = 22, label }: LikeProps) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const sound = useSound();
  const pop = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  const wasLiked = useRef(liked);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (liked === wasLiked.current) return;
    wasLiked.current = liked;
    if (!liked || reduceMotion) return;
    if (Platform.OS === 'android' && sound.vibration) Vibration.vibrate(12);
    pop.setValue(0.7);
    Animated.spring(pop, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: native }).start();
    burst.setValue(0);
    Animated.timing(burst, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [liked, reduceMotion, sound.vibration, pop, burst]);

  const tone = liked ? colors.danger : colors.muted;
  const accessible = label ?? (onPress ? 'Нравится' : `Нравится: ${count}`);

  return (
    <ActionShell label={accessible} role={onPress ? 'switch' : 'text'} checked={liked} onPress={onPress} size={size} count={count} countColor={tone}>
      {() => (
        <View style={{ width: size, height: size }}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <HeartIcon color={tone} filled={liked} size={size} />
          </Animated.View>
          <Burst progress={burst} size={size} color={colors.danger} />
        </View>
      )}
    </ActionShell>
  );
}

// Вспышка: маленькие точки разлетаются от центра сердца и гаснут
function Burst({ progress, size, color }: { progress: Animated.Value; size: number; color: string }) {
  const dot = Math.max(3, Math.round(size / 6));
  const reach = size * 0.95;
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  return (
    <View pointerEvents="none" style={styles.burst}>
      {Array.from({ length: PARTICLES }, (_, i) => {
        const angle = (i / PARTICLES) * Math.PI * 2 - Math.PI / 2;
        const x = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * reach] });
        const y = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * reach] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: color,
              opacity,
              transform: [{ translateX: x }, { translateY: y }, { scale }],
            }}
          />
        );
      })}
    </View>
  );
}

// Облачко комментария: «нажим» при касании
export function CommentButton({ count, onPress, size = 22, label }: { count?: number; onPress?: () => void; size?: number; label?: string }) {
  const colors = useColors();
  return (
    <ActionShell
      label={label ?? (count !== undefined ? `Комментарии: ${count}` : 'Комментарии')}
      onPress={onPress}
      size={size}
      count={count}
      countColor={colors.muted}
    >
      {() => <CommentIcon color={colors.muted} size={size} />}
    </ActionShell>
  );
}

// «Поделиться»: тот же стиль линий
export function ShareButton({ onPress, size = 22 }: { onPress?: () => void; size?: number }) {
  const colors = useColors();
  return (
    <ActionShell label="Поделиться" onPress={onPress} size={size} countColor={colors.muted}>
      {() => <ShareIcon color={colors.muted} size={size} />}
    </ActionShell>
  );
}

// Большое сердце по центру поста при двойном касании: появляется пружиной и гаснет
export function useBigHeart() {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const show = () => {
    scale.setValue(0.4);
    opacity.setValue(1);
    if (reduceMotion) {
      Animated.timing(opacity, { toValue: 0, duration: 500, delay: 300, useNativeDriver: native }).start();
      scale.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, speed: 16, bounciness: 12, useNativeDriver: native }),
      Animated.timing(opacity, { toValue: 0, duration: 350, delay: 450, useNativeDriver: native }),
    ]).start();
  };

  const view = (
    <View pointerEvents="none" style={styles.big}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <HeartIcon color={colors.danger} filled size={84} />
      </Animated.View>
    </View>
  );
  return { show, view };
}

// Область, где двойное касание ставит лайк. Одиночное касание ничего не делает.
export function DoubleTapLike({ onLike, children }: { onLike: () => void; children: ReactNode }) {
  const big = useBigHeart();
  const lastTap = useRef(0);

  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      big.show();
      onLike();
    } else {
      lastTap.current = now;
    }
  };

  return (
    <Pressable accessible={false} onPress={tap}>
      {children}
      {big.view}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24 },
  count: { fontVariant: ['tabular-nums'] },
  layer: { position: 'absolute', left: 0, right: 0 },
  burst: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  big: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
