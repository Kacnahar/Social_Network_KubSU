import { SIGNUP_STEPS } from '../../features/auth/registration';
import { useSession, useSignedIn } from '../../lib/session';
import { ProfileForm } from '../../ui/ProfileForm';

export default function ProfileSetupScreen() {
  const { signOut, setProfile } = useSession();
  const { profile } = useSignedIn();
  // Когда профиль сохранён, этот экран перестаёт быть доступным и навигация сама открывает главный
  return (
    <ProfileForm
      title="Расскажите о себе"
      initial={profile}
      onSaved={setProfile}
      footer={{ title: 'Выйти', onPress: () => void signOut() }}
      step={{ current: SIGNUP_STEPS, total: SIGNUP_STEPS }}
    />
  );
}
