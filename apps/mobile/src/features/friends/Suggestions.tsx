import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../ui/Avatar';
import { CloseIcon } from '../../ui/icons';
import { radius, type, useColors } from '../../ui/theme';
import { RowButton } from './FriendRow';
import type { Person } from './testData';

type Props = { people: Person[]; faculty: string; onHideAll: () => void; onHideOne: (id: string) => void };

// «Возможно, знакомы»: неброская лента людей с того же факультета. Можно скрыть одного или весь раздел крестиком
export function Suggestions({ people, faculty, onHideAll, onHideOne }: Props) {
  const colors = useColors();
  const [sent, setSent] = useState<string[]>([]);
  if (people.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={[type.subhead, styles.title, { color: colors.textPrimary }]}>Возможно, знакомы</Text>
          <Text numberOfLines={1} style={[type.footnote, { color: colors.textSecondary }]}>{faculty ? `С вашего факультета · ${faculty}` : 'С вашего факультета'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Скрыть раздел" hitSlop={10} onPress={onHideAll} style={styles.close}>
          <CloseIcon color={colors.textSecondary} size={12} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} keyboardShouldPersistTaps="handled">
        {people.map((person) => (
          <View key={person.id} style={[styles.card, { borderColor: colors.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Скрыть: ${person.name}`} hitSlop={8} onPress={() => onHideOne(person.id)} style={styles.cardClose}>
              <CloseIcon color={colors.textSecondary} size={9} />
            </Pressable>
            <Avatar avatarUrl={null} name={person.name} size={56} />
            <Text numberOfLines={1} style={[type.footnote, styles.name, { color: colors.textPrimary }]}>{person.name.split(' ')[0]}</Text>
            <Text numberOfLines={1} style={[type.caption, { color: colors.textSecondary }]}>@{person.nickname}</Text>
            {sent.includes(person.id) ? (
              <Text style={[type.footnote, styles.sent, { color: colors.textSecondary }]}>Отправлено</Text>
            ) : (
              <RowButton primary title="Добавить" label={`Добавить в друзья: ${person.name}`} onPress={() => setSent((current) => [...current, person.id])} />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 4, paddingBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  headText: { flex: 1 },
  title: { fontWeight: '700' },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  strip: { gap: 10, paddingHorizontal: 16 },
  card: { width: 124, alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 8, borderRadius: radius.control + 3, borderWidth: StyleSheet.hairlineWidth },
  cardClose: { position: 'absolute', right: 6, top: 6, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '600', marginTop: 4 },
  sent: { height: 32, textAlignVertical: 'center', lineHeight: 32 },
});
