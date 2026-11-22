import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatSlotStart, formatTimeUntil } from '../lib/slotTime';
import type { SlotsState } from '../lib/useSlots';
import { Orb } from './Orb';
import { type, useColors } from './theme';

const DAY_MS = 24 * 60 * 60 * 1000;

// Вход в комнату одной кнопкой: ничего вводить не нужно, человек уже вошёл в приложение под своим ником
export function RoomEntry({ state }: { state: SlotsState }) {
  const colors = useColors();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const next = state.status === 'ready' ? state.slots[0] : undefined;
  const joinable = Boolean(next?.joinable);

  let headline = 'Комнат пока нет';
  let detail = 'Как только появится расписание, вход будет здесь';
  if (state.status === 'loading') {
    headline = 'Загружаем расписание…';
    detail = '';
  } else if (next && joinable) {
    headline = next.title;
    detail = next.state === 'upcoming' ? 'Вход открыт — нажмите, чтобы войти' : 'Идёт сейчас — нажмите, чтобы войти';
  } else if (next && state.status === 'ready') {
    const startsAt = new Date(next.startsAt);
    const soon = startsAt.getTime() - state.now.getTime() < DAY_MS;
    headline = next.title;
    detail = soon
      ? `${formatSlotStart(startsAt, state.now)} · ${formatTimeUntil(startsAt, state.now)}`
      : formatSlotStart(startsAt, state.now);
  }

  const handlePress = () => {
    if (joinable && next) {
      // Маршрут /room появится в типах после перезапуска dev-сервера, поэтому приведение
      router.push({ pathname: '/room', params: { slotId: next.id } } as unknown as Href);
    } else if (next && state.status === 'ready') {
      setNotice(`Комната откроется ${formatSlotStart(new Date(next.startsAt), state.now)}`);
    } else setNotice('Сейчас войти некуда');
  };

  return (
    <View style={styles.wrap}>
      <Orb
        label={joinable ? `Войти в комнату «${headline}»` : `Комната: ${headline}. ${detail}`}
        active={joinable}
        onPress={handlePress}
      />
      <View style={styles.caption}>
        <Text style={[type.title, styles.center, { color: colors.text }]}>{headline}</Text>
        {detail ? (
          <Text style={[type.subhead, styles.center, { color: joinable ? colors.success : colors.muted }, joinable && styles.live]}>
            {detail}
          </Text>
        ) : null}
        {notice ? (
          <Text accessibilityLiveRegion="polite" style={[type.footnote, styles.center, { color: colors.muted }]}>
            {notice}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4, paddingVertical: 4 },
  caption: { alignItems: 'center', gap: 4, minHeight: 72 },
  center: { textAlign: 'center' },
  live: { fontWeight: '600' },
});
