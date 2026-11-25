import { Redirect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { JoinRoomResponse } from '@app/shared';
import { getRoomState, joinRoom, leaveRoom } from '../../features/rooms/api';
import { AfterRoom } from '../../features/rooms/AfterRoom';
import { formatBlockedUntil, isInFuture, minutesLeft, voteResultText } from '../../features/rooms/moderation';
import { ParticipantList } from '../../features/rooms/ParticipantList';
import { RoomControls } from '../../features/rooms/RoomControls';
import { formatMinutesLeft } from '../../features/rooms/slotTime';
import { useRoomState } from '../../features/rooms/useRoomState';
import { VoteBanner } from '../../features/rooms/VoteBanner';
import { usePersona } from '../../features/rooms/usePersona';
import { useCall, voiceSupported } from '../../features/rooms/voice';
import { ApiError } from '../../lib/api';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, ErrorText, LoadingScreen, Screen, Title } from '../../ui/components';
import { ForceScheme, type, useColors } from '../../ui/theme';

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
  const otherNicknames = useRef<string[]>([]);
  // Поднятая рука пока живёт только на этом экране: сервер о ней не знает, другие её не видят
  const [handRaised, setHandRaised] = useState(false);
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
  // Ники тех, кто был в комнате со мной: пригодятся на экране «Хотите пообщаться ещё?»
  for (const participant of call.participants) {
    if (!participant.isMe && !otherNicknames.current.includes(participant.name)) otherNicknames.current.push(participant.name);
  }
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

  // Комната закончилась или человек вышел сам — предлагаем отметить, с кем было интересно.
  // Ники берём из памяти экрана: это только ники комнат, без профилей
  if (timeUp || call.status === 'ended') {
    return <AfterRoom nicknames={otherNicknames.current} onDone={() => router.dismissTo('/voice')} />;
  }

  if (call.status === 'error') {
    return (
      <Screen>
        <Title>Комната</Title>
        <ErrorText>{call.error ?? 'Связь с комнатой прервалась'}</ErrorText>
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
    // Комната всегда тёмная, какой бы ни была тема телефона
    <ForceScheme scheme="dark">
      <RoomFrame
        top={
          <View style={styles.header}>
            <Title>Комната</Title>
            <Body muted>
              {call.participants.length} в комнате · до конца {formatMinutesLeft(new Date(join.endsAt), new Date(now))}
            </Body>
          </View>
        }
        bottom={
          <View style={styles.bottom}>
            {/* При голосовании единственная primary-кнопка экрана — «Поддержать» */}
            {call.needsAudioUnlock ? <Button variant={vote ? 'secondary' : 'primary'} title="Включить звук" onPress={call.unlockAudio} /> : null}
            <ErrorText>{call.micError}</ErrorText>
            <RoomControls
              micEnabled={call.micEnabled}
              micBusy={call.micBusy}
              micBlocked={micBlocked}
              micNote={micNote}
              onToggleMic={call.toggleMic}
              handRaised={handRaised}
              onToggleHand={() => setHandRaised((value) => !value)}
              // Выход ведёт на экран «Хотите пообщаться ещё?», а не сразу к расписанию
              onLeave={() => leave(false)}
            />
          </View>
        }
      >
        {!vote && result ? <RoomNote tone="muted">{voteResultText(result, nameOf(result.targetPersonaId))}</RoomNote> : null}
        {call.status === 'reconnecting' ? <RoomNote tone="danger">Связь пропала, подключаемся заново…</RoomNote> : null}

        {vote && roomId ? (
          <VoteBanner
            vote={vote}
            targetName={nameOf(vote.targetPersonaId)}
            token={token}
            onChanged={refresh}
            onUnauthorized={onUnauthorized}
          />
        ) : null}

        <ParticipantList
          participants={call.participants}
          roomId={join.roomId}
          token={token}
          voteActive={vote !== null}
          handRaised={handRaised}
          onChanged={refresh}
          onUnauthorized={onUnauthorized}
        />
      </RoomFrame>
    </ForceScheme>
  );
}

// Рамка комнаты: заголовок, прокручиваемая середина с участниками и закреплённые внизу кнопки
function RoomFrame({ top, bottom, children }: { top: ReactNode; bottom: ReactNode; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <View style={[styles.column, styles.top]}>{top}</View>
        <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.column, styles.middle]}>{children}</View>
        </ScrollView>
        <View style={[styles.column, styles.controls, { borderTopColor: colors.border }]}>{bottom}</View>
      </SafeAreaView>
    </View>
  );
}

function RoomNote({ tone, children }: { tone: 'muted' | 'danger'; children: string }) {
  const colors = useColors();
  return (
    <Text accessibilityLiveRegion="polite" style={[tone === 'danger' ? type.headline : type.subhead, { color: tone === 'danger' ? colors.danger : colors.muted }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  top: { paddingTop: 20, paddingBottom: 12 },
  header: { gap: 4 },
  scroll: { flexGrow: 1 },
  middle: { gap: 16, paddingTop: 12, paddingBottom: 24 },
  controls: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingBottom: 12 },
  bottom: { gap: 10 },
  connecting: { alignItems: 'center', gap: 12 },
});
