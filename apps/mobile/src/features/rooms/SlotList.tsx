import type { Slot } from '@app/shared';
import { Fragment } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { formatSlotStart, formatTimeUntil } from './slotTime';
import type { SlotsState } from './useSlots';
import { Body, Button, ErrorText, Separator } from '../../ui/components';
import { type, useColors } from '../../ui/theme';

const MAX_SLOTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function SlotRow({ slot, now, showCountdown }: { slot: Slot; now: Date; showCountdown: boolean }) {
  const colors = useColors();
  const startsAt = new Date(slot.startsAt);
  // «завтра · через 1 день» ничего не добавляет: обратный отсчёт нужен только в последние сутки
  const countdown = showCountdown && startsAt.getTime() - now.getTime() < DAY_MS;
  return (
    <View style={styles.row}>
      <Text style={[type.body, styles.slotTitle, { color: colors.text }]}>{slot.title}</Text>
      {slot.state === 'live' ? (
        <>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.highlight }]} />
            <Text style={[type.subhead, styles.live, { color: colors.live }]}>Идёт сейчас</Text>
          </View>
        </>
      ) : (
        <Body muted>
          {formatSlotStart(startsAt, now)}
          {countdown ? ` · ${formatTimeUntil(startsAt, now)}` : ''}
        </Body>
      )}
    </View>
  );
}

export function SlotList({ state, onRetry }: { state: SlotsState; onRetry: () => void }) {
  const colors = useColors();
  if (state.status === 'loading') return <ActivityIndicator color={colors.accent} />;
  if (state.status === 'error') {
    return (
      <>
        <ErrorText>{state.message}</ErrorText>
        <Button variant="secondary" title="Повторить" onPress={onRetry} />
      </>
    );
  }
  const slots = state.slots.slice(0, MAX_SLOTS);
  if (slots.length === 0) return <Body muted>Пока комнат в расписании нет</Body>;
  const firstUpcomingId = slots.find((slot) => slot.state === 'upcoming')?.id;
  return (
    <View style={styles.list}>
      {slots.map((slot, index) => (
        <Fragment key={slot.id}>
          {index > 0 ? <Separator /> : null}
          <SlotRow slot={slot} now={state.now} showCountdown={slot.id === firstUpcomingId} />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { gap: 2 },
  slotTitle: { fontWeight: '500' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  live: { fontWeight: '600' },
});
