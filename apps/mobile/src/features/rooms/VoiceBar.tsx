import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Orb } from './Orb';
import { describeRooms } from './roomStatus';
import { formatSlotStart } from './slotTime';
import { useSlots } from './useSlots';
import { useSession, useSignedIn } from '../../lib/session';
import { Glass } from '../../ui/components';
import { type, useColors, useReduceMotion } from '../../ui/theme';

const ORB_SIZE = 52;

// Закреплённая в ленте строка анонимного войса; ведёт на вкладку «Войс». Рисуется только у студента
export function VoiceBar() {
  const router = useRouter();
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const { state } = useSlots(token, () => void forgetSession());
  const scale = useRef(new Animated.Value(1)).current;
  const { kind, next, now } = describeRooms(state);
  const joinable = kind === 'open' || kind === 'live';

  let status = 'Загружаем расписание…';
  if (kind === 'live') status = 'Идёт сейчас — можно войти';
  else if (kind === 'open') status = 'Вход открыт';
  else if (kind === 'later' && next && now) status = formatSlotStart(new Date(next.startsAt), now);
  else if (kind === 'none') status = 'Комнат пока нет';

  // Отклик — в момент касания; пружина без отскока
  const press = (pressed: boolean) => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: pressed ? 0.98 : 1,
      speed: 40,
      bounciness: 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Анонимный войс. ${status}`}
        onPress={() => router.navigate('/voice')}
        onPressIn={() => press(true)}
        onPressOut={() => press(false)}
      >
        <Glass contentStyle={styles.row}>
          {/* Шар здесь только картинка: нажатие обрабатывает вся строка */}
          <View pointerEvents="none" style={styles.orb}>
            <Orb size={ORB_SIZE} label="Анонимный войс" active={joinable} />
          </View>
          <View style={styles.text}>
            <Text numberOfLines={1} style={[type.headline, { color: colors.text }]}>
              Анонимный войс
            </Text>
            <Text
              numberOfLines={1}
              style={[type.subhead, joinable && styles.live, { color: joinable ? colors.success : colors.muted }]}
            >
              {status}
            </Text>
          </View>
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16 },
  // Свечение шара шире его самого — отдаём ему место без увеличения строки
  orb: { width: ORB_SIZE, height: ORB_SIZE, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  live: { fontWeight: '600' },
});
