import { LOGIN_CODE_LENGTH, TEST_LOGIN_CODE, isTestLoginEmail } from '@app/shared';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SIGNUP_STEPS } from '../features/auth/registration';
import { authStart, authVerify } from '../lib/api';
import { useSession } from '../lib/session';
import { CodeField } from '../ui/CodeField';
import { Body, Button } from '../ui/components';
import { StepScreen } from '../ui/StepScreen';

// Сколько секунд ждать, прежде чем можно запросить код ещё раз
const RESEND_WAIT = 60;

export default function VerifyScreen() {
  const router = useRouter();
  const { pendingLogin, setPendingLogin, signIn } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<'verify' | 'resend' | null>(null);
  const [wait, setWait] = useState(RESEND_WAIT);

  // Обратный отсчёт до повторной отправки
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  if (!pendingLogin) return <Redirect href="/welcome" />;

  // Анкета (или код приглашения) в черновике входа есть только при регистрации — тогда показываем шаги
  const isSignup = Boolean(pendingLogin.signup ?? pendingLogin.inviteCode);
  // Только при разработке: тестовые аккаунты входят по короткому коду. Боевой сервер его не принимает
  const isTestCode = __DEV__ && isTestLoginEmail(pendingLogin.email) && code === TEST_LOGIN_CODE;
  const codeIsComplete = code.length === LOGIN_CODE_LENGTH || isTestCode;

  const submit = async () => {
    if (!codeIsComplete) {
      setError(`Введите ${LOGIN_CODE_LENGTH} цифр из письма`);
      return;
    }
    setError(null);
    setNotice(null);
    setLoading('verify');
    try {
      // Профиль из анкеты сервер создаёт сам — человек попадает прямо в ленту
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
      const response = await authStart({ email: pendingLogin.email, inviteCode: pendingLogin.inviteCode, signup: pendingLogin.signup });
      setPendingLogin({ ...pendingLogin, devCode: response.devCode });
      setCode('');
      setNotice('Отправили новый код');
      setWait(RESEND_WAIT);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
    } finally {
      setLoading(null);
    }
  };

  // Возвращаемся к анкете (или к входу): введённое там сохраняется, почту можно поправить
  const changeEmail = () => {
    setPendingLogin(null);
    if (router.canGoBack()) router.back();
    else router.replace(isSignup ? '/register' : '/login');
  };

  return (
    <StepScreen
      title="Подтвердите почту"
      subtitle={`Мы отправили код на ${pendingLogin.email}. Он действует 10 минут`}
      step={isSignup ? { current: 3, total: SIGNUP_STEPS } : undefined}
      onBack={changeEmail}
      primary={{
        title: isSignup ? 'Готово' : 'Войти',
        onPress: () => void submit(),
        loading: loading === 'verify',
        disabled: loading === 'resend' || !codeIsComplete,
      }}
      footer={
        <>
          <Button
            variant="plain"
            title={wait > 0 ? `Отправить ещё раз через ${wait} с` : 'Отправить ещё раз'}
            onPress={() => void resend()}
            loading={loading === 'resend'}
            disabled={loading === 'verify' || wait > 0}
          />
          <Button variant="plain" title="Изменить почту" onPress={changeEmail} disabled={loading !== null} />
        </>
      }
    >
      <CodeField
        label="Код из письма"
        length={LOGIN_CODE_LENGTH}
        value={code}
        onChange={(next) => {
          setCode(next);
          setError(null);
        }}
        error={error}
        hint={pendingLogin.devCode ? `Режим разработки: письма не отправляются. Ваш код — ${pendingLogin.devCode}` : undefined}
      />
      {notice ? <Body muted>{notice}</Body> : null}
    </StepScreen>
  );
}
