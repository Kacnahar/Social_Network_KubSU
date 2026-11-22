import { can } from '@app/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { deleteAccount } from '../lib/api';
import { disablePush } from '../lib/push';
import { useSession, useSignedIn } from '../lib/session';
import { Avatar } from '../ui/Avatar';
import { Body, Button, Card, CardTitle, ErrorText, Screen } from '../ui/components';
import { type, useColors } from '../ui/theme';
import { RoomsHomeSection } from '../features/rooms/RoomsHomeSection';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signOut, forgetSession } = useSession();
  const { token, account, profile } = useSignedIn();
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
      await disablePush(null);
      await forgetSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setBusy(null);
    }
  };

  const name = profile?.displayName ?? '';

  return (
    <Screen align="top">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Открыть мой профиль"
        onPress={() => router.push('/profile')}
        style={({ pressed }) => [styles.greeting, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Avatar avatarUrl={profile?.avatarUrl ?? null} name={name} size={44} />
        <Text numberOfLines={1} style={[type.title, styles.greetingText, { color: colors.text }]}>
          Привет, {name}
        </Text>
      </Pressable>

      {can(account.role, 'rooms') ? (
        <RoomsHomeSection disabled={busy !== null} />
      ) : (
        <Card>
          <CardTitle>Лента появится скоро</CardTitle>
          <Body muted>Здесь будут посты и истории</Body>
        </Card>
      )}

      {can(account.role, 'publish') ? (
        <Button variant="secondary" title="Новый пост" onPress={() => router.push('/posts/new')} disabled={busy !== null} />
      ) : null}

      <Button variant="secondary" title="Выйти" onPress={handleSignOut} loading={busy === 'signOut'} disabled={busy === 'delete'} />

      {confirmingDelete ? (
        <Card>
          <Body>Удалить аккаунт? Профиль, фото и все данные исчезнут навсегда, отменить это нельзя.</Body>
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

const styles = StyleSheet.create({
  greeting: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetingText: { flexShrink: 1 },
});
