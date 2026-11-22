import { useRouter } from 'expo-router';
import { useSignedIn } from '../../lib/session';
import { Button, Screen } from '../../ui/components';
import { ProfileView } from '../../ui/ProfileView';

export default function MyProfileScreen() {
  const router = useRouter();
  const { profile } = useSignedIn();
  if (!profile) return null;
  return (
    <Screen align="top">
      <ProfileView profile={profile} />
      <Button variant="secondary" title="Редактировать" onPress={() => router.push('/profile/edit')} />
      <Button variant="plain" title="Назад" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
