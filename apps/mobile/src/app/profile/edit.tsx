import { useRouter } from 'expo-router';
import { EditProfile } from '../../features/profile/EditProfile';
import { useSession, useSignedIn } from '../../lib/session';

// «Редактировать профиль»: новый экран в стиле Threads и Telegram. Первое заполнение после регистрации по-прежнему на ui/ProfileForm
export default function ProfileEditScreen() {
  const router = useRouter();
  const { setProfile } = useSession();
  const { profile } = useSignedIn();
  const close = () => (router.canGoBack() ? router.back() : router.dismissTo('/profile'));
  if (!profile) return null;
  return (
    <EditProfile
      initial={profile}
      onClose={close}
      onSaved={(next) => {
        setProfile(next);
        router.dismissTo('/profile');
      }}
    />
  );
}
