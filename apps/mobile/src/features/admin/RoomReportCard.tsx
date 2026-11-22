import type { AdminRoomReport } from '@app/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatPostTime } from '../../lib/relativeTime';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { Body, Button, Card, CardTitle, ErrorText } from '../../ui/components';
import { Segmented } from '../../ui/Segmented';
import { type, useColors } from '../../ui/theme';
import { banFromRooms, closeRoomReport, liftRoomsBan } from './api';
import { BAN_DAY_OPTIONS, blockedUntilText, roomReporterLabel, roomTargetLabel } from './format';

type Props = { report: AdminRoomReport; now: Date; onDone: () => void };

// Здесь только ники комнат: имён, аватаров и ссылок на профиль быть не должно
export function RoomReportCard({ report, now, onDone }: Props) {
  const colors = useColors();
  const fail = useFail();
  const { token } = useSignedIn();
  const [banning, setBanning] = useState(false);
  const [days, setDays] = useState(BAN_DAY_OPTIONS[0]?.value ?? '1');
  const [busy, setBusy] = useState<'ban' | 'lift' | 'close' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (kind: 'ban' | 'lift' | 'close', action: () => Promise<unknown>) => {
    setError(null);
    setBusy(kind);
    try {
      await action();
      setBanning(false);
      onDone();
    } catch (caught) {
      setError(await fail(caught));
    } finally {
      setBusy(null);
    }
  };

  const target = report.target;

  return (
    <Card>
      <View style={styles.head}>
        <CardTitle>Жалоба из комнаты</CardTitle>
        <Text style={[type.footnote, { color: colors.muted }]}>{formatPostTime(new Date(report.createdAt), now)}</Text>
      </View>
      <Body>{report.text}</Body>
      <Body muted>{roomTargetLabel(target)}</Body>
      <Body muted>{roomReporterLabel(report.reporter)}</Body>

      {target?.blockedUntil ? (
        <>
          <Body>{blockedUntilText(target.blockedUntil)}</Body>
          <Button
            variant="secondary"
            title="Открыть вход"
            onPress={() => void act('lift', () => liftRoomsBan(token, target.personaId))}
            loading={busy === 'lift'}
            disabled={busy !== null}
          />
        </>
      ) : target ? (
        banning ? (
          <>
            <Segmented options={BAN_DAY_OPTIONS} value={days} onChange={setDays} />
            <Button
              variant="danger"
              title="Закрыть вход"
              onPress={() => void act('ban', () => banFromRooms(token, target.personaId, Number(days)))}
              loading={busy === 'ban'}
              disabled={busy !== null}
            />
            <Button variant="plain" title="Отмена" onPress={() => setBanning(false)} disabled={busy !== null} />
          </>
        ) : (
          <Button variant="plainDanger" title="Закрыть вход в комнаты" onPress={() => setBanning(true)} disabled={busy !== null} />
        )
      ) : null}

      {report.status === 'new' ? (
        <Button
          variant="secondary"
          title="Закрыть жалобу"
          onPress={() => void act('close', () => closeRoomReport(token, report.reportId))}
          loading={busy === 'close'}
          disabled={busy !== null}
        />
      ) : null}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
