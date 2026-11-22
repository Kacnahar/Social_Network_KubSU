import {
  NICKNAME_CHANGE_INTERVAL_DAYS,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PROBLEM_TEXT,
  checkNickname,
} from '@rooms/shared';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ApiError, setNickname } from '../lib/api';
import { useSession, useSignedIn } from '../lib/session';
import { Body, Button, Card, ErrorText, Field, Screen, Title } from '../ui/components';

export default function NicknameScreen() {
  const router = useRouter();
  const { setMe, forgetSession, signOut } = useSession();
  const { token, me } = useSignedIn();

  const [nickname, setNicknameText] = useState(me.nickname ?? '');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Главный экран открывается только когда ник уже записан в сессию, поэтому уходим через Redirect
  const [saved, setSaved] = useState(false);
  const [isChange] = useState(me.nickname !== null);

  const problem = checkNickname(nickname);
  // «Занято» для служебных имён говорит сервер, чтобы не раскрывать их список
  const localError = touched && problem && problem !== 'reserved' ? NICKNAME_PROBLEM_TEXT[problem] : null;

  const submit = async () => {
    setTouched(true);
    if (problem && problem !== 'reserved') return;
    setError(null);
    setLoading(true);
    try {
      setMe(await setNickname(token, nickname));
      setSaved(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') {
        await forgetSession();
        return;
      }
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setLoading(false);
    }
  };

  if (saved && me.nickname !== null) return <Redirect href="/" />;

  return (
    <Screen>
      <Title>{isChange ? 'Новый ник' : 'Придумайте ник'}</Title>
      <Body muted>
        Под этим ником вас будут видеть в комнатах. Настоящее имя и почту собеседники не узнают.
      </Body>

      <Card>
        <Field
          label="Ник"
          value={nickname}
          onChangeText={(text) => {
            setNicknameText(text);
            setError(null);
          }}
          onBlur={() => setTouched(true)}
          maxLength={NICKNAME_MAX_LENGTH + 10}
          placeholder="Например, Ночной_кот"
          hint={`От ${NICKNAME_MIN_LENGTH} до ${NICKNAME_MAX_LENGTH} символов: буквы, цифры и «_».`}
          error={localError}
          returnKeyType="done"
          onSubmitEditing={submit}
          autoFocus
        />
        <Body muted>Сменить ник можно будет только через {NICKNAME_CHANGE_INTERVAL_DAYS} дней — выбирайте внимательно.</Body>
        <ErrorText>{error}</ErrorText>
        <Button title="Сохранить" onPress={submit} loading={loading} />
      </Card>

      {isChange ? (
        <Button variant="plain" title="Отмена" onPress={() => router.replace('/')} disabled={loading} />
      ) : (
        <Button variant="plain" title="Выйти" onPress={signOut} disabled={loading} />
      )}
    </Screen>
  );
}
