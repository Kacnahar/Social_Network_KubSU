import { authStartRequestSchema } from '@rooms/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { authStart } from '../lib/api';
import { useSession } from '../lib/session';
import { Body, Button, ErrorText, Field, Screen, Title } from '../ui/components';

type Mode = 'register' | 'login';

export default function LoginScreen() {
  const router = useRouter();
  const { setPendingLogin } = useSession();
  const [mode, setMode] = useState<Mode>('register');
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const parsed = authStartRequestSchema.safeParse({
      email,
      inviteCode: mode === 'register' ? inviteCode : undefined,
    });
    if (!parsed.success) {
      const badField = parsed.error.issues[0]?.path[0];
      setError(badField === 'inviteCode' ? 'Введите код приглашения' : 'Введите почту, например name@mail.ru');
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

  const switchMode = () => {
    setMode(mode === 'register' ? 'login' : 'register');
    setError(null);
  };

  return (
    <Screen>
      <Title>Комнаты</Title>
      <Body muted>
        {mode === 'register'
          ? 'Анонимные голосовые комнаты для знакомства. Вход по коду приглашения.'
          : 'Введите почту, с которой вы регистрировались.'}
      </Body>

      {mode === 'register' ? (
        <Field
          label="Код приглашения"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          placeholder="Например, ABCD-2026"
          returnKeyType="next"
        />
      ) : null}
      <Field
        label="Почта"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        inputMode="email"
        placeholder="name@mail.ru"
        hint="На неё придёт код для входа. Собеседники почту не увидят."
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <ErrorText>{error}</ErrorText>
      <Button title="Получить код" onPress={submit} loading={loading} />
      <Button
        variant="secondary"
        title={mode === 'register' ? 'У меня уже есть аккаунт' : 'У меня есть код приглашения'}
        onPress={switchMode}
        disabled={loading}
      />
    </Screen>
  );
}
