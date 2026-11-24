import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, type, useColors } from '../../ui/theme';
import { formatEventDate, type UniEvent } from './events';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// Строка события: «обложка» с числом и месяцем, справа название, дата с временем и место
export function EventRow({ event, onPress }: { event: UniEvent; onPress: () => void }) {
  const colors = useColors();
  const date = new Date(event.startsAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}. ${formatEventDate(event.startsAt)}. ${event.place}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.cover, { backgroundColor: colors.primary }]}>
        <Text style={[type.title, { color: colors.onPrimary }]}>{date.getDate()}</Text>
        <Text style={[type.footnote, { color: colors.onPrimary }]}>{MONTHS[date.getMonth()]}</Text>
      </View>
      <View style={styles.text}>
        <Text numberOfLines={2} style={[type.headline, { color: colors.text }]}>
          {event.title}
        </Text>
        <Text style={[type.subhead, { color: colors.text }]}>{formatEventDate(event.startsAt).split(', ')[1]}</Text>
        <Text numberOfLines={1} style={[type.footnote, { color: colors.muted }]}>
          {event.place}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, paddingVertical: 14, paddingHorizontal: 20, marginHorizontal: -20, borderBottomWidth: StyleSheet.hairlineWidth },
  cover: { width: 72, height: 72, borderRadius: radius.field, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 3, justifyContent: 'center' },
});
