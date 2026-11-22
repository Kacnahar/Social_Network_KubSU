import { useRouter } from 'expo-router';
import { useState } from 'react';
import { deleteAccount } from '../../lib/api';
import { disablePush } from '../../lib/push';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, Card, CardTitle, ErrorText, Screen } from '../../ui/components';
import { ProfileView } from '../../ui/ProfileView';
import { ProfilePosts } from '../../features/posts/ProfilePosts';

export default function MyProfileScreen() {
  const router = useRouter();
  const { signOut, forgetSession } = useSession();
  const { token, profile, account } = useSignedIn();
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

  if (!profile) return null;
  return (
    <Screen align="top">
      <ProfileView profile={profile} />
      <Button variant="secondary" title="Редактировать" onPress={() => router.push('/profile/edit')} disabled={busy !== null} />
      {account.isAdmin ? <Button variant="secondary" title="Админка" onPress={() => router.push('/admin')} disabled={busy !== null} /> : null}
      <ProfilePosts profileId={profile.profileId} />

      <Card>
        <CardTitle>Аккаунт</CardTitle>
        <Button variant="secondary" title="Выйти" onPress={handleSignOut} loading={busy === 'signOut'} disabled={busy === 'delete'} />
        {confirmingDelete ? (
          <>
            <Body>Удалить аккаунт? Профиль, фото и все данные исчезнут навсегда, отменить это нельзя.</Body>
            <ErrorText>{error}</ErrorText>
            <Button variant="danger" title="Да, удалить навсегда" onPress={handleDelete} loading={busy === 'delete'} />
            <Button variant="secondary" title="Отмена" onPress={() => setConfirmingDelete(false)} disabled={busy !== null} />
          </>
        ) : (
          <Button variant="plainDanger" title="Удалить аккаунт" onPress={() => setConfirmingDelete(true)} disabled={busy !== null} />
        )}
      </Card>
    </Screen>
  );
}
