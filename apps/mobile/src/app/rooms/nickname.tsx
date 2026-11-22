import {
  NICKNAME_CHANGE_INTERVAL_DAYS,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PROBLEM_TEXT,
  checkNickname,
  type RoomPersonaResponse,
} from '@app/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { setNickname } from '../../features/rooms/api';
import { usePersona } from '../../features/rooms/usePersona';
import { ApiError } from '../../lib/api';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, Card, ErrorText, Field, LoadingScreen, Screen, Title } from '../../ui/components';

export default function NicknameScreen() {
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const { status, persona, reload, setPersona } = usePersona(token, () => void forgetSession());

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error' || !persona) {
    return (
      <Screen>
        <Title>Ник комнат</Title>
        <Body muted>Не получилось загрузить данные. Проверьте интернет и попробуйте ещё раз.</Body>
        <Button title="Попробовать ещё раз" onPress={reload} />
      </Screen>
    );
  }
  return <NicknameForm token={token} nicknameNow={persona.nickname} setPersona={setPersona} />;
}

function NicknameForm({
  token,
  nicknameNow,
  setPersona,
}: {
  token: string;
  nicknameNow: string | null;
  setPersona: (persona: RoomPersonaResponse) => void;
}) {
  const router = useRouter();
  const { forgetSession } = useSession();

  const [nickname, setNicknameText] = useState(nicknameNow ?? '');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChange] = useState(nicknameNow !== null);

  const problem = checkNickname(nickname);
  // «Занято» для служебных имён говорит сервер, чтобы не раскрывать их список
  const localError = touched && problem && problem !== 'reserved' ? NICKNAME_PROBLEM_TEXT[problem] : null;

  const submit = async () => {
    setTouched(true);
    if (problem && problem !== 'reserved') return;
    setError(null);
    setLoading(true);
    try {
      setPersona(await setNickname(token, nickname));
      router.dismissTo('/voice');
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') {
        await forgetSession();
        return;
      }
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>{isChange ? 'Новый ник' : 'Придумайте ник'}</Title>
      <Body muted>Под этим ником вас будут видеть в комнатах. Имя, фото и профиль собеседники не узнают.</Body>
      <Body muted>Знакомые могут узнать вас по голосу.</Body>

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
        <Button variant="plain" title="Отмена" onPress={() => router.dismissTo('/voice')} disabled={loading} />
      ) : (
        <Button variant="plain" title="Назад" onPress={() => router.dismissTo('/voice')} disabled={loading} />
      )}
    </Screen>
  );
}
