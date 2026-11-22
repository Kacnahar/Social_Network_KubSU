import { useRouter } from 'expo-router';
import { useState } from 'react';
import { deleteAccount } from '../lib/api';
import { useSession, useSignedIn } from '../lib/session';
import { Body, Button, Card, ErrorText, Screen, Title } from '../ui/components';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

export default function HomeScreen() {
  const router = useRouter();
  const { signOut, forgetSession } = useSession();
  const { token, me } = useSignedIn();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<'signOut' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setBusy('signOut');
    await signOut();
  };

  const handleDelete = async () => {
    setError(null);
    setBusy('delete');
    try {
      await deleteAccount(token);
      await forgetSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Title>Привет, {me.nickname}</Title>

      <Card>
        <Body>Расписание комнат</Body>
        <Body muted>Скоро здесь появятся ближайшие комнаты и напоминания о них.</Body>
      </Card>

      <Card>
        <Body>Ник</Body>
        {me.nicknameChangeAvailableAt ? (
          <Body muted>Сменить можно будет {dateFormat.format(new Date(me.nicknameChangeAvailableAt))}.</Body>
        ) : (
          <Button variant="secondary" title="Сменить ник" onPress={() => router.push('/nickname')} disabled={busy !== null} />
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
        <Button variant="danger" title="Удалить аккаунт" onPress={() => setConfirmingDelete(true)} disabled={busy !== null} />
      )}
    </Screen>
  );
}
