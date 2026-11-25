import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EXAMPLE_GROUPS, exampleWeek, type ExampleGroup } from '../../features/catalog/scheduleExample';
import { Chips } from '../../ui/Chips';
import { Screen, Title } from '../../ui/components';
import { BackButton } from '../../ui/BackButton';
import { IconButton } from '../../ui/IconButton';
import { radius, type, useColors } from '../../ui/theme';

const GROUPS = EXAMPLE_GROUPS.map((value) => ({ value, label: value }));

// Расписание пар. ЗАГЛУШКА: пример недели на выдуманных данных и выбор группы; настоящего расписания пока нет
export default function ScheduleScreen() {
  const router = useRouter();
  const colors = useColors();
  const [group, setGroup] = useState<ExampleGroup>('ИТ-21');
  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));

  return (
    <Screen align="top">
      <View style={styles.bar}>
        <BackButton inline onPress={back} />
      </View>
      <Title>Расписание</Title>

      <View style={[styles.banner, { backgroundColor: colors.highlightTint }]}>
        <Text style={[type.footnote, styles.bannerText, { color: colors.live }]}>Пример. Настоящее расписание пар скоро появится</Text>
      </View>

      <View style={styles.group}>
        <Text style={[type.subhead, styles.label, { color: colors.muted }]}>Ваша группа</Text>
        <Chips options={GROUPS} value={group} allowNone={false} onChange={(value) => value && setGroup(value)} />
      </View>

      <View>
        {exampleWeek(group).map((day) => (
          <View key={day.day} style={styles.day}>
            <Text style={[type.headline, { color: colors.text }]}>{day.day}</Text>
            {day.lessons.length === 0 ? <Text style={[type.subhead, { color: colors.muted }]}>Занятий нет</Text> : null}
            {day.lessons.map((lesson) => (
              <View key={`${day.day}-${lesson.time}`} style={[styles.lesson, { borderBottomColor: colors.border }]}>
                <Text style={[type.headline, styles.time, { color: colors.text }]}>{lesson.time}</Text>
                <View style={styles.lessonText}>
                  <Text style={[type.body, { color: colors.text }]}>{lesson.subject}</Text>
                  <Text style={[type.footnote, { color: colors.muted }]}>
                    {lesson.kind} · {lesson.room}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', marginBottom: -4 },
  banner: { borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: 10 },
  bannerText: { fontWeight: '600' },
  group: { gap: 8 },
  label: { fontWeight: '500', marginLeft: 4 },
  day: { gap: 4, paddingTop: 18 },
  lesson: { flexDirection: 'row', gap: 14, paddingVertical: 10, paddingHorizontal: 20, marginHorizontal: -20, borderBottomWidth: StyleSheet.hairlineWidth },
  time: { width: 54, fontVariant: ['tabular-nums'] },
  lessonText: { flex: 1, gap: 2 },
});
