import { useRouter } from 'expo-router';
import { useState } from 'react';
import { deleteAccount } from '../lib/api';
import { disablePush } from '../lib/push';
import { useSession, useSignedIn } from '../lib/session';
import { Body, Button, Card, CardTitle, ErrorText, Screen, Title } from '../ui/components';
import { PushCard } from '../ui/PushCard';
import { RoomEntry } from '../features/rooms/RoomEntry';
import { SlotList } from '../features/rooms/SlotList';
import { useSlots } from '../features/rooms/useSlots';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

export default function HomeScreen() {
  const router = useRouter();
  const { signOut, forgetSession } = useSession();
  const { token, persona } = useSignedIn();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<'signOut' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { state: slots, reload } = useSlots(token, () => void forgetSession());

  const handleSignOut = async () => {
    setBusy('signOut');
    await signOut();
  };

  const handleDelete = async () => {
    setError(null);
    setBusy('delete');
    try {
      await deleteAccount(token);
      await disablePush(null);
      await forgetSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setBusy(null);
    }
  };

  return (
    <Screen align="top">
      <Title>Привет, {persona.nickname}</Title>

      <RoomEntry state={slots} />

      <Card>
        <CardTitle>Расписание</CardTitle>
        <SlotList state={slots} onRetry={reload} />
      </Card>

      <PushCard token={token} disabled={busy !== null} />

      <Card>
        <CardTitle>Ник</CardTitle>
        {persona.nicknameChangeAvailableAt ? (
          <Body muted>Сменить можно будет {dateFormat.format(new Date(persona.nicknameChangeAvailableAt))}.</Body>
        ) : (
          <Button variant="secondary" title="Сменить ник" onPress={() => router.push('/rooms/nickname')} disabled={busy !== null} />
        )}
      </Card>

      <Button variant="secondary" title="Выйти" onPress={handleSignOut} loading={busy === 'signOut'} disabled={busy === 'delete'} />

      {confirmingDelete ? (
        <Card>
          <Body>Удалить аккаунт? Ник и все данные исчезнут навсегда, отменить это нельзя.</Body>
          <ErrorText>{error}</ErrorText>
          <Button variant="danger" title="Да, удалить навсегда" onPress={handleDelete} loading={busy === 'delete'} />
          <Button variant="secondary" title="Отмена" onPress={() => setConfirmingDelete(false)} disabled={busy !== null} />
        </Card>
      ) : (
        <Button variant="plainDanger" title="Удалить аккаунт" onPress={() => setConfirmingDelete(true)} disabled={busy !== null} />
      )}
    </Screen>
  );
}
