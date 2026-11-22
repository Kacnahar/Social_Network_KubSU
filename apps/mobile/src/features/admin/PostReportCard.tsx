import type { AdminPostReport } from '@app/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { mediaUrl } from '../../lib/api';
import { formatPostTime } from '../../lib/relativeTime';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { Avatar } from '../../ui/Avatar';
import { Body, Button, Card, CardTitle, ErrorText } from '../../ui/components';
import { radius, type, useColors } from '../../ui/theme';
import { dismissPostReport, removeReportedRecord } from './api';
import { photoPreview, postReportTitle, postReporterLabel, reportsOnTargetNote, resolutionLabel } from './format';

const THUMB = 72;

type Props = { report: AdminPostReport; now: Date; onDone: () => void };

export function PostReportCard({ report, now, onDone }: Props) {
  const router = useRouter();
  const colors = useColors();
  const fail = useFail();
  const { token } = useSignedIn();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'remove' | 'dismiss' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (kind: 'remove' | 'dismiss') => {
    setError(null);
    setBusy(kind);
    try {
      await (kind === 'remove' ? removeReportedRecord(token, report.reportId) : dismissPostReport(token, report.reportId));
      onDone();
    } catch (caught) {
      setError(await fail(caught));
    } finally {
      setBusy(null);
    }
  };

  const note = reportsOnTargetNote(report.reportsOnTarget);
  const target = report.target;
  const { shown, more } = photoPreview(target?.photos ?? []);

  return (
    <Card>
      <View style={styles.head}>
        <CardTitle>{postReportTitle(report.targetType)}</CardTitle>
        <Text style={[type.footnote, { color: colors.muted }]}>{formatPostTime(new Date(report.createdAt), now)}</Text>
      </View>
      {note ? <Body muted>{note}</Body> : null}
      <Body>Причина: {report.reason || 'не указана'}</Body>
      <Body muted>{postReporterLabel(report.reporter)}</Body>

      {target ? (
        <View style={[styles.record, { backgroundColor: colors.fill }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Открыть профиль: ${target.author.displayName}`}
            onPress={() => router.push(`/profiles/${target.author.profileId}`)}
            style={({ pressed }) => [styles.author, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Avatar avatarUrl={target.author.avatarUrl} name={target.author.displayName} size={32} />
            <Text numberOfLines={1} style={[type.headline, styles.authorName, { color: colors.text }]}>
              {target.author.displayName}
            </Text>
          </Pressable>
          {target.text ? <Body>{target.text}</Body> : null}
          {shown.length > 0 ? (
            <View style={styles.thumbs}>
              {shown.map((photo, index) => (
                <Image
                  key={`${photo.url}-${index}`}
                  source={{ uri: mediaUrl(photo.url) ?? undefined }}
                  accessibilityLabel={`Фото ${index + 1}`}
                  style={[styles.thumb, { backgroundColor: colors.card }]}
                  resizeMode="cover"
                />
              ))}
              {more > 0 ? <Text style={[type.subhead, { color: colors.muted }]}>ещё {more}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : (
        <Body muted>Запись уже удалена</Body>
      )}

      {report.status === 'closed' ? (
        <Body muted>{resolutionLabel(report.resolution)}</Body>
      ) : target === null ? (
        <Button variant="secondary" title="Закрыть жалобу" onPress={() => void act('remove')} loading={busy === 'remove'} />
      ) : confirming ? (
        <>
          <Body>Удалить запись без возможности вернуть?</Body>
          <Button variant="danger" title="Да, удалить" onPress={() => void act('remove')} loading={busy === 'remove'} disabled={busy !== null} />
          <Button variant="plain" title="Отмена" onPress={() => setConfirming(false)} disabled={busy !== null} />
        </>
      ) : (
        <>
          <Button variant="danger" title="Удалить запись" onPress={() => setConfirming(true)} disabled={busy !== null} />
          <Button variant="secondary" title="Оставить запись" onPress={() => void act('dismiss')} loading={busy === 'dismiss'} disabled={busy !== null} />
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  // Сплошная тонированная вставка: стекло на стекло не кладём
  record: { borderRadius: radius.field, borderCurve: 'continuous', padding: 12, gap: 10 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  authorName: { flexShrink: 1 },
  thumbs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.field, borderCurve: 'continuous' },
});
