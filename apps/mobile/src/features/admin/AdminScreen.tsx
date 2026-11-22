import { ADMIN_ACTION_LABEL, type ReportStatus } from '@app/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { formatPostTime } from '../../lib/relativeTime';
import { Body, Button, Card, CardTitle, ErrorText, ListScreen, Screen, Title } from '../../ui/components';
import { Segmented } from '../../ui/Segmented';
import { type, useColors } from '../../ui/theme';
import { listAdminLog, listPostReports, listRoomReports } from './api';
import { logSubline } from './format';
import { PostReportCard } from './PostReportCard';
import { RoomReportCard } from './RoomReportCard';
import { useAdminList, type AdminListState } from './useAdminList';

type Section = 'posts' | 'rooms' | 'log';

const SECTIONS = [
  { value: 'posts', label: 'Записи' },
  { value: 'rooms', label: 'Комнаты' },
  { value: 'log', label: 'Журнал' },
] as const;

const STATUSES = [
  { value: 'new', label: 'Новые' },
  { value: 'closed', label: 'Разобранные' },
] as const;

type ListProps = { header: ReactNode; onForbidden: () => void };

// Один и тот же каркас у всех трёх списков: состояния, «потянуть», кнопка «Обновить»
function AdminList<T extends { key: string }>({
  header,
  list,
  emptyText,
  renderItem,
  onForbidden,
}: {
  header: ReactNode;
  onForbidden: () => void;
  list: { state: AdminListState<T>; refreshing: boolean; refresh: () => Promise<void>; retry: () => void };
  emptyText: string;
  renderItem: (item: T) => ReactNode;
}) {
  const colors = useColors();
  const { state } = list;
  const items = state.status === 'ready' ? state.items : [];
  useEffect(() => {
    if (state.status === 'forbidden') onForbidden();
  }, [state.status, onForbidden]);
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => <View style={styles.item}>{renderItem(item)}</View>}
      ListHeaderComponent={<View style={styles.header}>{header}</View>}
      ListFooterComponent={
        <View style={styles.footer}>
          {state.status === 'loading' ? <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} /> : null}
          {state.status === 'error' ? (
            <Card>
              <CardTitle>Не получилось загрузить</CardTitle>
              <ErrorText>{state.message}</ErrorText>
              <Button variant="secondary" title="Попробовать ещё раз" onPress={list.retry} />
            </Card>
          ) : null}
          {state.status === 'ready' && items.length === 0 ? <Body muted>{emptyText}</Body> : null}
          {state.status === 'ready' ? <Button variant="plain" title="Обновить" onPress={() => void list.refresh()} loading={list.refreshing} /> : null}
        </View>
      }
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => void list.refresh()} tintColor={colors.accent} />}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

function PostsSection({ header, status, onForbidden }: ListProps & { status: ReportStatus }) {
  const list = useAdminList((token) => listPostReports(token, status), `posts-${status}`);
  const [now] = useState(() => new Date());
  const state = list.state.status === 'ready' ? { status: 'ready' as const, items: list.state.items.map((r) => ({ ...r, key: r.reportId })) } : list.state;
  return (
    <AdminList
      header={header}
      onForbidden={onForbidden}
      list={{ ...list, state }}
      emptyText={status === 'new' ? 'Новых жалоб нет' : 'Пока пусто'}
      renderItem={(report) => <PostReportCard report={report} now={now} onDone={list.reload} />}
    />
  );
}

function RoomsSection({ header, status, onForbidden }: ListProps & { status: ReportStatus }) {
  const list = useAdminList((token) => listRoomReports(token, status), `rooms-${status}`);
  const [now] = useState(() => new Date());
  const state = list.state.status === 'ready' ? { status: 'ready' as const, items: list.state.items.map((r) => ({ ...r, key: r.reportId })) } : list.state;
  return (
    <AdminList
      header={header}
      onForbidden={onForbidden}
      list={{ ...list, state }}
      emptyText={status === 'new' ? 'Новых жалоб нет' : 'Пока пусто'}
      renderItem={(report) => <RoomReportCard report={report} now={now} onDone={list.reload} />}
    />
  );
}

function LogSection({ header, onForbidden }: ListProps) {
  const colors = useColors();
  const list = useAdminList(listAdminLog, 'log');
  const [now] = useState(() => new Date());
  const state = list.state.status === 'ready' ? { status: 'ready' as const, items: list.state.items.map((r) => ({ ...r, key: r.entryId })) } : list.state;
  return (
    <AdminList
      header={header}
      onForbidden={onForbidden}
      list={{ ...list, state }}
      emptyText="Пока пусто"
      renderItem={(entry) => (
        <View style={styles.logRow}>
          <Text style={[type.body, { color: colors.text }]}>
            {ADMIN_ACTION_LABEL[entry.action]}
            {entry.note ? ` · ${entry.note}` : ''}
          </Text>
          <Text style={[type.footnote, { color: colors.muted }]}>{logSubline(entry, formatPostTime(new Date(entry.createdAt), now))}</Text>
        </View>
      )}
    />
  );
}

export function AdminScreen() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('posts');
  const [status, setStatus] = useState<ReportStatus>('new');
  const [forbidden, setForbidden] = useState(false);
  const onForbidden = useCallback(() => setForbidden(true), []);

  if (forbidden) {
    return (
      <Screen>
        <Title>Этот раздел только для админов</Title>
        <Button title="На главную" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const header = (
    <>
      <Button variant="plain" title="Назад" onPress={back} />
      <Title>Админка</Title>
      <Segmented options={SECTIONS} value={section} onChange={setSection} />
      {section !== 'log' ? <Segmented options={STATUSES} value={status} onChange={setStatus} /> : null}
    </>
  );

  return (
    <ListScreen>
      {section === 'posts' ? <PostsSection header={header} status={status} onForbidden={onForbidden} /> : null}
      {section === 'rooms' ? <RoomsSection header={header} status={status} onForbidden={onForbidden} /> : null}
      {section === 'log' ? <LogSection header={header} onForbidden={onForbidden} /> : null}
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 28, paddingBottom: 28 },
  header: { gap: 12, paddingBottom: 16 },
  item: { paddingBottom: 16 },
  footer: { gap: 12 },
  spinner: { paddingVertical: 24 },
  logRow: { gap: 2, paddingVertical: 8 },
});
