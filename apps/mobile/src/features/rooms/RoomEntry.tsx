import type { RoomPersonaResponse } from '@app/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatSlotStart, formatTimeUntil } from './slotTime';
import { describeRooms } from './roomStatus';
import type { SlotsState } from './useSlots';
import { Orb } from './Orb';
import { Button } from '../../ui/components';
import { type, useColors } from '../../ui/theme';

const DAY_MS = 24 * 60 * 60 * 1000;

// Вход в комнату одной кнопкой: ничего вводить не нужно, человек уже вошёл в приложение под своим ником
export function RoomEntry({ state, persona }: { state: SlotsState; persona: RoomPersonaResponse | null }) {
  const colors = useColors();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const { kind, next, now } = describeRooms(state);
  const joinable = kind === 'open' || kind === 'live';

  let headline = 'Комнат пока нет';
  let detail = 'Как только появится расписание, вход будет здесь';
  if (kind === 'loading') {
    headline = 'Загружаем расписание…';
    detail = '';
  } else if (next && now) {
    headline = next.title;
    if (kind === 'open') detail = 'Вход открыт — нажмите, чтобы войти';
    else if (kind === 'live') detail = 'Идёт сейчас — нажмите, чтобы войти';
    else {
      const startsAt = new Date(next.startsAt);
      detail =
        startsAt.getTime() - now.getTime() < DAY_MS
          ? `${formatSlotStart(startsAt, now)} · ${formatTimeUntil(startsAt, now)}`
          : formatSlotStart(startsAt, now);
    }
  }

  const handlePress = () => {
    if (joinable && next) {
      // Ника ещё нет — сначала экран ника; пока персона не загрузилась, экран комнаты проверит сам
      if (persona && persona.nickname === null) router.push('/rooms/nickname');
      else router.push({ pathname: '/rooms/call', params: { slotId: next.id } });
    } else if (next && now) {
      setNotice(`Комната откроется ${formatSlotStart(new Date(next.startsAt), now)}`);
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
          <Text style={[type.subhead, styles.center, { color: joinable ? colors.live : colors.muted }, joinable && styles.live]}>
            {detail}
          </Text>
        ) : null}
        {notice ? (
          <Text accessibilityLiveRegion="polite" style={[type.footnote, styles.center, { color: colors.muted }]}>
            {notice}
          </Text>
        ) : null}
      </View>
      <View style={styles.join}>
        <Button title="Войти" onPress={handlePress} disabled={!joinable} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4, paddingVertical: 4 },
  caption: { alignItems: 'center', gap: 4, minHeight: 72 },
  join: { alignSelf: 'stretch', paddingTop: 8 },
  center: { textAlign: 'center' },
  live: { fontWeight: '600' },
});
