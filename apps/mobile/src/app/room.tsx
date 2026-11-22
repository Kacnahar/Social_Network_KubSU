import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ApiError, joinRoom, leaveRoom } from '../lib/api';
import { useSession, useSignedIn } from '../lib/session';
import { formatMinutesLeft } from '../lib/slotTime';
import { useCall, voiceSupported } from '../lib/voice';
import type { JoinRoomResponse } from '@rooms/shared';
import { Body, Button, Card, ErrorText, Screen, Title } from '../ui/components';
import { MicButton } from '../ui/MicButton';
import { ParticipantList } from '../ui/ParticipantList';
import { type, useColors } from '../ui/theme';

const TICK_MS = 30_000;

type JoinState =
  | { status: 'joining' }
  | { status: 'failed'; message: string }
  | { status: 'joined'; join: JoinRoomResponse };

export default function RoomScreen() {
  const { slotId } = useLocalSearchParams<{ slotId?: string }>();
  if (!slotId) return <Redirect href="/" />;
  if (!voiceSupported) return <Unsupported />;
  return <Room slotId={slotId} />;
}

function Unsupported() {
  const router = useRouter();
  const { error } = useCall(null);
  return (
    <Screen>
      <Title>Комната</Title>
      <Body muted>{error ?? 'Звонки в приложении появятся позже. Пока откройте комнату в браузере'}</Body>
      <Button title="На главную" onPress={() => router.replace('/')} />
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
      if (goHome) router.replace('/');
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

  useEffect(() => {
    if (timeUp) leave(false);
  }, [timeUp, leave]);

  useEffect(() => {
    if (call.status === 'ended') leave(false);
  }, [call.status, leave]);

  // Закрытие вкладки или уход с экрана: просим сервер отметить выход, соединение рвёт сам хук
  useEffect(() => {
    return () => {
      if (!leftRef.current && roomId) {
        leftRef.current = true;
        void leaveRoom(token, roomId).catch(() => undefined);
      }
    };
  }, [roomId, token]);

  if (joinState.status === 'failed') {
    return (
      <Screen>
        <Title>Комната</Title>
        <ErrorText>{joinState.message}</ErrorText>
        <Button title="На главную" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (timeUp) {
    return (
      <Screen>
        <Title>Комната закончилась</Title>
        <Body muted>Спасибо, что были с нами. Загляните в следующий раз.</Body>
        <Button title="На главную" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (call.status === 'error' || call.status === 'ended') {
    return (
      <Screen>
        <Title>Комната</Title>
        <ErrorText>{call.error ?? 'Вы вышли из комнаты'}</ErrorText>
        <Button title="На главную" onPress={() => router.replace('/')} />
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

  return (
    <Screen align="top">
      <View style={styles.header}>
        <Title>Комната</Title>
        <Body muted>
          {call.participants.length} в комнате · до конца {formatMinutesLeft(new Date(join.endsAt), new Date(now))}
        </Body>
      </View>

      {call.status === 'reconnecting' ? (
        <Text accessibilityLiveRegion="polite" style={[type.headline, { color: colors.danger }]}>
          Связь пропала, подключаемся заново…
        </Text>
      ) : null}

      <Card>
        <ParticipantList participants={call.participants} />
      </Card>

      {call.needsAudioUnlock ? <Button title="Включить звук" onPress={call.unlockAudio} /> : null}

      <View style={styles.mic}>
        <MicButton enabled={call.micEnabled} busy={call.micBusy} onPress={call.toggleMic} />
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
