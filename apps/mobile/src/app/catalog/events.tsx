import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EVENTS, EVENT_FILTERS, filterEvents, type EventFilter } from '../../features/events/events';
import { EventRow } from '../../features/events/EventRow';
import { BackButton } from '../../ui/BackButton';
import { Chips } from '../../ui/Chips';
import { ListScreen, Title } from '../../ui/components';
import { showToast } from '../../ui/toastStore';
import { type, useColors } from '../../ui/theme';

// Афиша (заготовка на тестовых данных): события университета и фильтр Сегодня / Неделя / Все. Только просмотр — «+» нет ни у кого
export default function EventsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [filter, setFilter] = useState<EventFilter>('all');
  const [now] = useState(() => new Date());
  const shown = filterEvents(EVENTS, filter, now);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));

  const header = (
    <View style={styles.header}>
      <View style={styles.top}>
        <BackButton inline onPress={back} />
      </View>
      <Title>Афиша</Title>
      <Chips options={EVENT_FILTERS} value={filter} allowNone={false} onChange={(value) => value && setFilter(value)} />
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
  );

  return (
    <ListScreen>
      <FlatList
        data={shown}
        keyExtractor={(event) => event.eventId}
        renderItem={({ item }) => <EventRow event={item} onPress={() => showToast('Страница события откроется позже')} />}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={[type.body, styles.empty, { color: colors.muted }]}>В этот период событий нет</Text>}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 28 },
  header: { gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: -20 },
  empty: { textAlign: 'center', paddingVertical: 40 },
});
