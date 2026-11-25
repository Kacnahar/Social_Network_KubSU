import { can } from '@app/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FORUM_CATEGORIES, filterTopics, useTopics, type ForumCategory } from '../../features/forum/forum';
import { TopicRow } from '../../features/forum/TopicRow';
import { useSignedIn } from '../../lib/session';
import { BackButton } from '../../ui/BackButton';
import { Chips } from '../../ui/Chips';
import { ListScreen, Title } from '../../ui/components';
import { PlusButton } from '../../ui/PlusButton';
import { SearchField } from '../../ui/SearchField';
import { showToast } from '../../ui/toastStore';
import { type, useColors } from '../../ui/theme';

// Форум (заготовка на тестовых данных): темы, чипы категорий, «+» — новая тема (гостю «+» не показывается)
export default function ForumScreen() {
  const router = useRouter();
  const colors = useColors();
  const { account } = useSignedIn();
  const topics = useTopics();
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [query, setQuery] = useState('');
  const [now] = useState(() => new Date());
  const shown = filterTopics(topics, category, query);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));

  const header = (
    <View style={styles.header}>
      <View style={styles.top}>
        <BackButton inline onPress={back} />
        {can(account.role, 'publish') ? <PlusButton label="Создать тему" onPress={() => router.push('/catalog/forum-new')} /> : <View style={styles.space} />}
      </View>
      <Title>Форум</Title>
      <SearchField value={query} onChangeText={setQuery} placeholder="Поиск по темам" />
      <Chips options={FORUM_CATEGORIES} value={category} onChange={setCategory} />
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
  );

  return (
    <ListScreen>
      <FlatList
        data={shown}
        keyExtractor={(topic) => topic.topicId}
        renderItem={({ item }) => <TopicRow topic={item} now={now} onPress={() => showToast('Обсуждение темы откроется позже')} />}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={[type.body, styles.empty, { color: colors.muted }]}>{query.trim() ? 'Ничего не нашлось. Попробуйте другие слова' : 'Здесь пока пусто'}</Text>}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 28 },
  header: { gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  space: { width: 44, height: 44 },
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: -20 },
  empty: { textAlign: 'center', paddingVertical: 40 },
});
