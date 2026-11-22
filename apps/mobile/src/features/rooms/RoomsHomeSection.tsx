import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { RoomEntry } from './RoomEntry';
import { SlotList } from './SlotList';
import { usePersona } from './usePersona';
import { useSlots } from './useSlots';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, Card, CardTitle } from '../../ui/components';
import { PushCard } from '../../ui/PushCard';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

// Всё «комнатное» на главном экране; рисуется только у студента, поэтому запросы комнат у других ролей не уходят
export function RoomsHomeSection({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const { state: slots, reload } = useSlots(token, () => void forgetSession());
  const { persona, reload: reloadPersona } = usePersona(token, () => void forgetSession());

  // После экрана ника возвращаемся сюда: обновляем персону, чтобы кнопка смены ника была верной
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else reloadPersona();
    }, [reloadPersona]),
  );

  const changeAt = persona?.nicknameChangeAvailableAt ? new Date(persona.nicknameChangeAvailableAt) : null;
  const canChange = persona !== null && persona.nickname !== null && (changeAt === null || changeAt.getTime() <= Date.now());

  return (
    <>
      <RoomEntry state={slots} persona={persona} />

      <Card>
        <CardTitle>Расписание</CardTitle>
        <SlotList state={slots} onRetry={reload} />
      </Card>

      <PushCard token={token} disabled={disabled} />

      {canChange ? (
        <Button variant="plain" title="Сменить ник комнат" onPress={() => router.push('/rooms/nickname')} disabled={disabled} />
      ) : changeAt ? (
        <Body muted>Ник комнат можно будет сменить {dateFormat.format(changeAt)}.</Body>
      ) : null}
    </>
  );
}
