import { authStartRequestSchema } from '@app/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { authStart } from '../lib/api';
import { useSession } from '../lib/session';
import { Field } from '../ui/components';
import { StepScreen } from '../ui/StepScreen';

// Вход в существующий аккаунт: только почта. Регистрация идёт через «Кто вы?» и анкету
export default function LoginScreen() {
  const router = useRouter();
  const { setPendingLogin } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const parsed = authStartRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError('Введите почту, например name@mail.ru');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await authStart(parsed.data);
      setPendingLogin({ ...parsed.data, devCode: response.devCode });
      router.push('/verify');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepScreen
      title="С возвращением"
      subtitle="Введите почту, с которой вы регистрировались"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
      primary={{ title: 'Получить код', onPress: () => void submit(), loading }}
    >
      <Field
        label="Почта"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        inputMode="email"
        placeholder="name@mail.ru"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        autoFocus
        error={error}
      />
    </StepScreen>
  );
}
