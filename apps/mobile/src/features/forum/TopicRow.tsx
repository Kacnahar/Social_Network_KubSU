import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPostTime } from '../../lib/relativeTime';
import { type, useColors } from '../../ui/theme';
import { FORUM_CATEGORIES, repliesLabel, type Topic } from './forum';

// Строка темы форума: заголовок, под ним автор, число ответов и время
export function TopicRow({ topic, now, onPress }: { topic: Topic; now: Date; onPress: () => void }) {
  const colors = useColors();
  const category = FORUM_CATEGORIES.find((item) => item.value === topic.category)?.label;
  const meta = `${topic.author} · ${repliesLabel(topic.replies)} · ${formatPostTime(new Date(topic.createdAt), now)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}. ${meta}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.text}>
        <Text numberOfLines={2} style={[type.headline, { color: colors.text }]}>
          {topic.title}
        </Text>
        <Text numberOfLines={1} style={[type.footnote, { color: colors.muted }]}>
          {meta}
        </Text>
      </View>
      {category ? (
        <View style={[styles.tag, { backgroundColor: colors.fill }]}>
          <Text style={[type.footnote, { color: colors.muted }]}>{category}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 20, marginHorizontal: -20, borderBottomWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, gap: 3 },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
});
