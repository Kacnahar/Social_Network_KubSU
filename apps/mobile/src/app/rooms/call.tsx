import { Redirect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { JoinRoomResponse } from '@app/shared';
import { getRoomState, joinRoom, leaveRoom } from '../../features/rooms/api';
import { MicButton } from '../../features/rooms/MicButton';
import { formatBlockedUntil, isInFuture, minutesLeft, voteResultText } from '../../features/rooms/moderation';
import { ParticipantList } from '../../features/rooms/ParticipantList';
import { formatMinutesLeft } from '../../features/rooms/slotTime';
import { useRoomState } from '../../features/rooms/useRoomState';
import { VoteBanner } from '../../features/rooms/VoteBanner';
import { usePersona } from '../../features/rooms/usePersona';
import { useCall, voiceSupported } from '../../features/rooms/voice';
import { ApiError } from '../../lib/api';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, Card, ErrorText, LoadingScreen, Screen, Title } from '../../ui/components';
import { type, useColors } from '../../ui/theme';

const TICK_MS = 30_000;

type JoinState =
  | { status: 'joining' }
  | { status: 'failed'; message: string }
  | { status: 'joined'; join: JoinRoomResponse };

export default function RoomScreen() {
  const { slotId } = useLocalSearchParams<{ slotId?: string }>();
  if (!slotId) return <Redirect href="/voice" />;
  if (!voiceSupported) return <Unsupported />;
  return <NicknameGate slotId={slotId} />;
}

// В комнату без ника не пускаем: сначала просим придумать его
function NicknameGate({ slotId }: { slotId: string }) {
  const router = useRouter();
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const { status, persona, reload } = usePersona(token, () => void forgetSession());

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error' || !persona) {
    return (
      <Screen>
        <Title>Комната</Title>
        <Body muted>Не получилось загрузить данные. Проверьте интернет и попробуйте ещё раз.</Body>
        <Button title="Попробовать ещё раз" onPress={reload} />
        <Button variant="plain" title="К комнатам" onPress={() => router.dismissTo('/voice')} />
      </Screen>
    );
  }
  if (persona.nickname === null) return <Redirect href="/rooms/nickname" />;
  return <Room slotId={slotId} />;
}

function Unsupported() {
  const router = useRouter();
  const { error } = useCall(null);
  return (
    <Screen>
      <Title>Комната</Title>
      <Body muted>{error ?? 'Звонки в приложении появятся позже. Пока откройте комнату в браузере'}</Body>
      <Button title="К комнатам" onPress={() => router.dismissTo('/voice')} />
    </Screen>
  );
}

function Room({ slotId }: { slotId: string }) {
  const router = useRouter();
  const colors = useColors();
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const [joinState, setJoinState] = useState<JoinState>({ status: 'joining' });
  const [now, setNow] = useState(() => Date.now());
  const [timeUp, setTimeUp] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const focused = useIsFocused();
  const names = useRef(new Map<string, string>());
  const leftRef = useRef(false);
  const forgetRef = useRef(forgetSession);
  forgetRef.current = forgetSession;

  useEffect(() => {
    // Отмена нужна, чтобы повторный запуск эффекта не оставил второй вход
    let cancelled = false;
    setJoinState({ status: 'joining' });
    joinRoom(token, slotId).then(
      (join) => !cancelled && setJoinState({ status: 'joined', join }),
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === 'unauthorized') {
          void forgetRef.current();
          return;
        }
        setJoinState({
          status: 'failed',
          message: error instanceof Error ? error.message : 'Не получилось войти в комнату',
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, slotId]);

  const join = joinState.status === 'joined' ? joinState.join : null;
  const call = useCall(join ? { voiceUrl: join.voiceUrl, voiceToken: join.voiceToken } : null);
  const { hangUp } = call;
  const roomId = join?.roomId;
  const endsAt = join ? new Date(join.endsAt).getTime() : null;

  // Разрыв соединения и запрос «вышел» — ровно один раз, что бы ни вызвало выход
  const leave = useCallback(
    (goHome: boolean) => {
      hangUp();
      if (!leftRef.current && roomId) {
        leftRef.current = true;
        void leaveRoom(token, roomId).catch(() => undefined);
      }
      if (goHome) router.dismissTo('/voice');
    },
    [hangUp, roomId, token, router],
  );

  useEffect(() => {
    if (endsAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    const untilEnd = endsAt - Date.now();
    const finish = setTimeout(() => setTimeUp(true), Math.max(0, untilEnd));
    return () => {
      clearInterval(timer);
      clearTimeout(finish);
    };
  }, [endsAt]);

  const onUnauthorized = useCallback(() => void forgetRef.current(), []);
  const { state, refresh } = useRoomState(
    token,
    roomId ?? null,
    focused && call.status === 'connected' && blockedUntil === null,
    onUnauthorized,
  );

  // Ники помним, чтобы итог голосования назвал и того, кто уже вышел
  for (const participant of call.participants) names.current.set(participant.id, participant.name);
  const nameOf = (personaId: string) => names.current.get(personaId) ?? null;

  // Меня выгнали: рвём соединение (повторный вызов безопасен) и показываем объяснение
  const kickedUntil = state?.blockedUntil ?? null;
  useEffect(() => {
    if (kickedUntil === null) return;
    setBlockedUntil(kickedUntil);
    leave(false);
  }, [kickedUntil, leave]);

  const { setLocallyMuted } = call;
  const mutesKey = state?.personalMutes.join(',');
  const personalMutes = state?.personalMutes;
  useEffect(() => {
    if (personalMutes) setLocallyMuted(personalMutes);
    // Список меняется по содержимому, а не по ссылке: опрос каждый раз отдаёт новый массив
  }, [mutesKey, setLocallyMuted]);

  // Срок запрета на микрофон истёк — кнопка должна ожить сразу, а не при следующем тике
  const mutedUntil = state?.mutedUntil ?? null;
  useEffect(() => {
    if (!mutedUntil) return;
    const delay = new Date(mutedUntil).getTime() - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), delay + 50);
    return () => clearTimeout(timer);
  }, [mutedUntil]);

  useEffect(() => {
    if (timeUp) leave(false);
  }, [timeUp, leave]);

  useEffect(() => {
    if (call.status === 'ended') leave(false);
  }, [call.status, leave]);

  // Сервер звука отключает выгнанного раньше, чем придёт очередной опрос: спрашиваем причину отдельно
  const callOver = call.status === 'ended' || call.status === 'error';
  useEffect(() => {
    if (!callOver || !roomId) return;
    let cancelled = false;
    getRoomState(token, roomId).then(
      (next) => {
        if (!cancelled && next.blockedUntil) setBlockedUntil(next.blockedUntil);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [callOver, roomId, token]);

  // Закрытие вкладки или уход с экрана: просим сервер отметить выход, соединение рвёт сам хук
  useEffect(() => {
    return () => {
      if (!leftRef.current && roomId) {
        leftRef.current = true;
        void leaveRoom(token, roomId).catch(() => undefined);
      }
    };
  }, [roomId, token]);

  if (blockedUntil !== null) {
    return (
      <Screen>
        <Title>Вас попросили выйти</Title>
        <Body>Участники комнаты проголосовали за это. Вход в комнаты снова откроется {formatBlockedUntil(blockedUntil)}.</Body>
        <Body muted>Если считаете это ошибкой, напишите организаторам</Body>
        <Button title="На главную" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

  if (joinState.status === 'failed') {
    return (
      <Screen>
        <Title>Комната</Title>
        <ErrorText>{joinState.message}</ErrorText>
        <Button title="К комнатам" onPress={() => router.dismissTo('/voice')} />
      </Screen>
    );
  }

  if (timeUp) {
    return (
      <Screen>
        <Title>Комната закончилась</Title>
        <Body muted>Спасибо, что были с нами. Загляните в следующий раз.</Body>
        <Button title="К комнатам" onPress={() => router.dismissTo('/voice')} />
      </Screen>
    );
  }

  if (call.status === 'error' || call.status === 'ended') {
    return (
      <Screen>
        <Title>Комната</Title>
        <ErrorText>{call.error ?? 'Вы вышли из комнаты'}</ErrorText>
        <Button title="К комнатам" onPress={() => router.dismissTo('/voice')} />
      </Screen>
    );
  }

  if (!join || call.status === 'connecting') {
    return (
      <Screen>
        <View style={styles.connecting}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Body muted>Подключаемся…</Body>
        </View>
      </Screen>
    );
  }

  const vote = state?.vote ?? null;
  const result = state?.lastResult ?? null;
  const micBlocked = isInFuture(state?.mutedUntil ?? null, Date.now());
  const micNote =
    micBlocked && state?.mutedUntil
      ? `Участники выключили вам микрофон. Он вернётся через ${Math.max(1, minutesLeft(state.mutedUntil, Date.now()))} мин`
      : null;

  return (
    <Screen align="top">
      <View style={styles.header}>
        <Title>Комната</Title>
        <Body muted>
          {call.participants.length} в комнате · до конца {formatMinutesLeft(new Date(join.endsAt), new Date(now))}
        </Body>
      </View>

      {!vote && result ? (
        <Text accessibilityLiveRegion="polite" style={[type.subhead, { color: colors.muted }]}>
          {voteResultText(result, nameOf(result.targetPersonaId))}
        </Text>
      ) : null}

      {call.status === 'reconnecting' ? (
        <Text accessibilityLiveRegion="polite" style={[type.headline, { color: colors.danger }]}>
          Связь пропала, подключаемся заново…
        </Text>
      ) : null}

      {vote && roomId ? (
        <VoteBanner
          vote={vote}
          targetName={nameOf(vote.targetPersonaId)}
          token={token}
          onChanged={refresh}
          onUnauthorized={onUnauthorized}
        />
      ) : null}

      <Card>
        <ParticipantList
          participants={call.participants}
          roomId={join.roomId}
          token={token}
          voteActive={vote !== null}
          onChanged={refresh}
          onUnauthorized={onUnauthorized}
        />
      </Card>

      {/* При голосовании единственная primary-кнопка экрана — «Поддержать» */}
      {call.needsAudioUnlock ? <Button variant={vote ? 'secondary' : 'primary'} title="Включить звук" onPress={call.unlockAudio} /> : null}

      <View style={styles.mic}>
        <MicButton enabled={call.micEnabled} busy={call.micBusy} onPress={call.toggleMic} disabled={micBlocked} note={micNote} />
        <ErrorText>{call.micError}</ErrorText>
      </View>

      <Button variant="plainDanger" title="Выйти из комнаты" onPress={() => leave(true)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  connecting: { alignItems: 'center', gap: 12 },
  mic: { alignItems: 'center', gap: 12, paddingVertical: 8 },
});
