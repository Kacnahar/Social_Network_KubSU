import { LOGIN_CODE_LENGTH } from '@app/shared';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { authStart, authVerify } from '../lib/api';
import { useSession } from '../lib/session';
import { Body, Button, Card, ErrorText, Field, Screen, Title } from '../ui/components';

export default function VerifyScreen() {
  const router = useRouter();
  const { pendingLogin, setPendingLogin, signIn } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<'verify' | 'resend' | null>(null);

  if (!pendingLogin) return <Redirect href="/login" />;

  const codeIsComplete = code.length === LOGIN_CODE_LENGTH;

  const submit = async () => {
    if (!codeIsComplete) {
      setError(`Введите ${LOGIN_CODE_LENGTH} цифр из письма`);
      return;
    }
    setError(null);
    setNotice(null);
    setLoading('verify');
    try {
      await signIn(await authVerify(pendingLogin.email, code));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setLoading(null);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    setLoading('resend');
    try {
      const response = await authStart({ email: pendingLogin.email, inviteCode: pendingLogin.inviteCode });
      setPendingLogin({ ...pendingLogin, devCode: response.devCode });
      setCode('');
      setNotice('Отправили новый код');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
    } finally {
      setLoading(null);
    }
  };

  const changeEmail = () => {
    setPendingLogin(null);
    router.replace('/login');
  };

  return (
    <Screen>
      <Title>Код из письма</Title>
      <Body muted>
        Если всё верно, на {pendingLogin.email} пришло письмо с кодом из {LOGIN_CODE_LENGTH} цифр. Он действует 10 минут.
      </Body>

      <Card>
        {pendingLogin.devCode ? (
          <Body muted>Режим разработки: письма пока не отправляются. Ваш код — {pendingLogin.devCode}</Body>
        ) : null}
        <Field
          label="Код"
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, LOGIN_CODE_LENGTH))}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={LOGIN_CODE_LENGTH}
          placeholder="000000"
          returnKeyType="go"
          onSubmitEditing={submit}
          autoFocus
          style={styles.code}
        />
        <ErrorText>{error}</ErrorText>
        {notice ? <Body muted>{notice}</Body> : null}
        <Button title="Войти" onPress={submit} loading={loading === 'verify'} disabled={loading === 'resend'} />
        <Button
          variant="secondary"
          title="Отправить код ещё раз"
          onPress={resend}
          loading={loading === 'resend'}
          disabled={loading === 'verify'}
        />
      </Card>

      <Button variant="plain" title="Изменить почту" onPress={changeEmail} disabled={loading !== null} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: 8, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
