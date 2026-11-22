import { useRouter } from 'expo-router';
import { useSession, useSignedIn } from '../../lib/session';
import { ProfileForm } from '../../ui/ProfileForm';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { setProfile } = useSession();
  const { profile } = useSignedIn();
  return (
    <ProfileForm
      title="Редактировать профиль"
      onBack={() => (router.canGoBack() ? router.back() : router.dismissTo('/profile'))}
      initial={profile}
      onSaved={(next) => {
        setProfile(next);
        router.dismissTo('/profile');
      }}
      footer={{ title: 'Отмена', onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/profile')) }}
    />
  );
}
