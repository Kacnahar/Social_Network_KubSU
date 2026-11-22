import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { deleteAccount } from '../../lib/api';
import { pausedUntilText } from '../../lib/banText';
import { disablePush } from '../../lib/push';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, ErrorText, Screen, Title } from '../../ui/components';
import { IconButton } from '../../ui/IconButton';
import { type, useColors } from '../../ui/theme';

// Настройки: админка, выход и удаление аккаунта. Открываются шестерёнкой на своём профиле
export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signOut, forgetSession } = useSession();
  const { token, account } = useSignedIn();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<'signOut' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

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
      <View style={styles.bar}>
        <IconButton label="Назад" onPress={back}>
          <View style={[styles.chevron, { borderColor: colors.text }]} />
        </IconButton>
      </View>
      <Title>Настройки</Title>
      {account.status === 'banned' ? <Body muted>{pausedUntilText(account.bannedUntil)}</Body> : null}

      {account.isAdmin ? (
        <View style={styles.group}>
          <Text style={[type.footnote, styles.label, { color: colors.muted }]}>Управление</Text>
          <Button variant="secondary" title="Админка" onPress={() => router.push('/admin')} disabled={busy !== null} />
        </View>
      ) : null}

      <View style={styles.group}>
        <Text style={[type.footnote, styles.label, { color: colors.muted }]}>Аккаунт</Text>
        <Button variant="secondary" title="Выйти" onPress={() => void handleSignOut()} loading={busy === 'signOut'} disabled={busy === 'delete'} />
        {confirmingDelete ? (
          <>
            <Body>Удалить аккаунт? Профиль, фото и все данные исчезнут навсегда, отменить это нельзя.</Body>
            <ErrorText>{error}</ErrorText>
            <Button variant="danger" title="Да, удалить навсегда" onPress={() => void handleDelete()} loading={busy === 'delete'} />
            <Button variant="secondary" title="Отмена" onPress={() => setConfirmingDelete(false)} disabled={busy !== null} />
          </>
        ) : (
          <Button variant="plainDanger" title="Удалить аккаунт" onPress={() => setConfirmingDelete(true)} disabled={busy !== null} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', marginBottom: -4 },
  chevron: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }], marginLeft: 4 },
  group: { gap: 10, paddingTop: 8 },
  label: { fontWeight: '600', marginLeft: 4 },
});
