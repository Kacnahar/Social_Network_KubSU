import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession, useSignedIn } from '../../lib/session';
import { Button, ErrorText } from '../../ui/components';
import { IconButton } from '../../ui/IconButton';
import { GearIcon } from '../../ui/icons';
import { radius, type, useColors } from '../../ui/theme';
import { describeRooms } from './roomStatus';
import { formatSlotStart, formatTimeUntil } from './slotTime';
import { usePersona } from './usePersona';
import { useSlots } from './useSlots';
import { formatClock, groupSlotsByDay } from './weekSchedule';

const DAY_MS = 24 * 60 * 60 * 1000;

// Вкладка «Войс»: шапка, крупная карточка ближайшей комнаты и расписание на неделю по дням.
// Вкладка есть только у студента, поэтому запросы комнат у других ролей не уходят
export function VoiceMenu() {
  const router = useRouter();
  const colors = useColors();
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const { state: slots, reload } = useSlots(token, () => void forgetSession());
  const { persona, reload: reloadPersona } = usePersona(token, () => void forgetSession());

  // После экрана ника возвращаемся сюда: обновляем персону, чтобы вход в комнату знал про ник
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else reloadPersona();
    }, [reloadPersona]),
  );

  const { kind, next, now } = describeRooms(slots);
  const joinable = kind === 'open' || kind === 'live';

  let when = '';
  if (next && now) {
    const startsAt = new Date(next.startsAt);
    if (kind === 'live') when = 'Идёт сейчас';
    else if (kind === 'open') when = 'Вход открыт';
    else when = startsAt.getTime() - now.getTime() < DAY_MS ? `${formatSlotStart(startsAt, now)} · ${formatTimeUntil(startsAt, now)}` : formatSlotStart(startsAt, now);
  }

  const enter = () => {
    if (!next) return;
    // Ника ещё нет — сначала экран ника; пока персона не загрузилась, экран комнаты проверит сам
    if (persona && persona.nickname === null) router.push('/rooms/nickname');
    else router.push({ pathname: '/rooms/call', params: { slotId: next.id } });
  };

  const groups = slots.status === 'ready' ? groupSlotsByDay(slots.slots, slots.now) : [];

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Text accessibilityRole="header" style={[type.largeTitle, { color: colors.text }]}>
          Войс
        </Text>
        <View style={styles.topActions}>
          {/* «Знакомые» — люди, с которыми совпало «хочу пообщаться ещё» */}
          <Pressable
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => router.push('/rooms/friends')}
            style={({ pressed }) => [styles.pill, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[type.subhead, styles.pillText, { color: colors.text }]}>Знакомые</Text>
          </Pressable>
          <IconButton label="Настройки войса" onPress={() => router.push('/rooms/settings')}>
            <GearIcon color={colors.text} />
          </IconButton>
        </View>
      </View>
      <Text style={[type.body, styles.subtitle, { color: colors.muted }]}>Анонимные комнаты для знакомства</Text>

      {/* Крупная карточка ближайшей комнаты */}
      <View style={[styles.card, { backgroundColor: colors.fill }]}>
        {kind === 'loading' ? <ActivityIndicator color={colors.accent} /> : null}
        {kind === 'none' ? (
          <>
            <Text style={[type.title, { color: colors.text }]}>Комнат пока нет</Text>
            <Text style={[type.subhead, { color: colors.muted }]}>Как только появится расписание, вход будет здесь</Text>
          </>
        ) : null}
        {next ? (
          <>
            <View style={styles.whenRow}>
              {kind === 'live' ? <View style={[styles.liveDot, { backgroundColor: colors.highlight }]} /> : null}
              <Text style={[type.subhead, styles.when, { color: joinable ? colors.live : colors.muted }]}>{when}</Text>
            </View>
            <Text accessibilityRole="header" style={[type.title, styles.roomTitle, { color: colors.text }]}>
              {next.title}
            </Text>
            <Text style={[type.subhead, { color: colors.muted }]}>
              Начало в {formatClock(new Date(next.startsAt))} · {next.durationMinutes} мин
            </Text>
            <View style={styles.cardButton}>
              {joinable ? (
                <Button title="Войти" onPress={enter} />
              ) : (
                <Button variant="secondary" title="Напомнить" onPress={() => router.push('/rooms/settings')} />
              )}
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.schedule}>
        <Text accessibilityRole="header" style={[type.title, { color: colors.text }]}>
          Расписание на неделю
        </Text>
        {slots.status === 'error' ? (
          <View style={styles.notice}>
            <ErrorText>{slots.message}</ErrorText>
            <Button variant="secondary" title="Повторить" onPress={reload} />
          </View>
        ) : null}
        {slots.status === 'ready' && groups.length === 0 ? (
          <Text style={[type.body, styles.empty, { color: colors.muted }]}>На этой неделе комнат нет</Text>
        ) : null}
        {groups.map((group) => (
          <View key={group.key}>
            <Text style={[type.footnote, styles.day, { color: colors.muted }]}>{group.label.charAt(0).toUpperCase() + group.label.slice(1)}</Text>
            {group.slots.map((slot) => (
              <View key={slot.id} style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={[type.headline, styles.clock, { color: colors.text }]}>{formatClock(new Date(slot.startsAt))}</Text>
                <View style={styles.rowText}>
                  <Text numberOfLines={2} style={[type.body, { color: colors.text }]}>
                    {slot.title}
                  </Text>
                  {slot.state === 'live' ? (
                    <View style={styles.whenRow}>
                      <View style={[styles.liveDot, { backgroundColor: colors.highlight }]} />
                      <Text style={[type.footnote, styles.when, { color: colors.live }]}>Идёт сейчас</Text>
                    </View>
                  ) : (
                    <Text style={[type.footnote, { color: colors.muted }]}>{slot.durationMinutes} мин</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontWeight: '600' },
  subtitle: { marginBottom: 10 },
  card: { borderRadius: radius.card, borderCurve: 'continuous', padding: 20, gap: 6 },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  when: { fontWeight: '600' },
  roomTitle: { fontSize: 26, lineHeight: 32 },
  cardButton: { paddingTop: 12 },
  schedule: { paddingTop: 22, gap: 4 },
  notice: { gap: 10, paddingVertical: 12 },
  empty: { paddingVertical: 20 },
  day: { fontWeight: '600', paddingTop: 14, paddingBottom: 2 },
  row: { flexDirection: 'row', gap: 14, paddingVertical: 12, paddingHorizontal: 20, marginHorizontal: -20, borderBottomWidth: StyleSheet.hairlineWidth },
  clock: { width: 54, fontVariant: ['tabular-nums'] },
  rowText: { flex: 1, gap: 2 },
});
