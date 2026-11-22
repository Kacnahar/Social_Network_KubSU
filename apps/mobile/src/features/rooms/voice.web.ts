import { Room, RoomEvent, Track, type Participant, type RemoteTrack } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Call, CallParticipant, CallStatus } from './voiceTypes';

export const voiceSupported = true;

const CONNECT_ERROR = 'Не получилось подключиться к комнате. Проверьте интернет и попробуйте ещё раз';
const KICKED_ERROR = 'Связь с комнатой прервалась';
const MIC_DENIED = 'Нет доступа к микрофону. Разрешите его в настройках браузера для этого сайта';
const MIC_MISSING = 'Микрофон не найден';
const MIC_FAILED = 'Не получилось включить микрофон';

const toParticipant = (participant: Participant, isMe: boolean): CallParticipant => ({
  id: participant.identity,
  name: participant.name || 'Без ника',
  isMe,
  isSpeaking: participant.isSpeaking,
  isMuted: !participant.isMicrophoneEnabled,
});

function listParticipants(room: Room): CallParticipant[] {
  const me = toParticipant(room.localParticipant, true);
  const others = Array.from(room.remoteParticipants.values(), (participant) => toParticipant(participant, false));
  others.sort((a, b) => Number(b.isSpeaking) - Number(a.isSpeaking) || a.name.localeCompare(b.name, 'ru'));
  return [me, ...others];
}

const ROOM_EVENTS = [
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.ActiveSpeakersChanged,
  RoomEvent.TrackMuted,
  RoomEvent.TrackUnmuted,
  RoomEvent.TrackPublished,
  RoomEvent.TrackUnpublished,
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
] as const;

export function useCall(connection: { voiceUrl: string; voiceToken: string } | null): Call {
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const teardownRef = useRef<(() => void) | null>(null);
  const micBusyRef = useRef(false);

  const voiceUrl = connection?.voiceUrl;
  const voiceToken = connection?.voiceToken;

  useEffect(() => {
    if (!voiceUrl || !voiceToken) return;

    const room = new Room({ adaptiveStream: false, dynacast: false });
    roomRef.current = room;
    // После нашего собственного разрыва события уже не нужны
    let closed = false;
    const audioElements = new Set<HTMLMediaElement>();

    const refresh = () => {
      if (closed) return;
      setParticipants(listParticipants(room));
      setMicEnabled(room.localParticipant.isMicrophoneEnabled);
    };

    const handleSubscribed = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio) return;
      const element = track.attach();
      element.style.display = 'none';
      document.body.appendChild(element);
      audioElements.add(element);
    };
    const handleUnsubscribed = (track: RemoteTrack) => {
      for (const element of track.detach()) {
        element.remove();
        audioElements.delete(element);
      }
    };
    const handleDisconnected = () => {
      if (closed) return;
      setStatus('ended');
      // Сам вышел — без текста; иначе нас отключил сервер (комната закрылась или удалили)
      setError((current) => current ?? KICKED_ERROR);
    };

    room
      .on(RoomEvent.TrackSubscribed, handleSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleUnsubscribed)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => !closed && setNeedsAudioUnlock(!room.canPlaybackAudio))
      .on(RoomEvent.Connected, () => !closed && setStatus('connected'))
      .on(RoomEvent.Reconnecting, () => !closed && setStatus('reconnecting'))
      .on(RoomEvent.Reconnected, () => !closed && setStatus('connected'))
      .on(RoomEvent.Disconnected, handleDisconnected);
    for (const event of ROOM_EVENTS) room.on(event, refresh);

    const teardown = () => {
      if (closed) return;
      closed = true;
      room.removeAllListeners();
      void room.disconnect();
      for (const element of audioElements) element.remove();
      audioElements.clear();
      if (roomRef.current === room) roomRef.current = null;
    };
    teardownRef.current = teardown;

    setStatus('connecting');
    setError(null);
    room.connect(voiceUrl, voiceToken).then(
      () => {
        if (closed) return;
        setStatus('connected');
        refresh();
      },
      () => {
        if (closed) return;
        setStatus('error');
        setError(CONNECT_ERROR);
      },
    );

    return () => {
      teardown();
      if (teardownRef.current === teardown) teardownRef.current = null;
    };
  }, [voiceUrl, voiceToken]);

  const toggleMic = useCallback(() => {
    const room = roomRef.current;
    if (!room || micBusyRef.current) return;
    micBusyRef.current = true;
    setMicBusy(true);
    setMicError(null);
    room.localParticipant
      .setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled)
      .then(
        () => undefined,
        (caught: unknown) => {
          const name = caught instanceof Error ? caught.name : '';
          if (name === 'NotAllowedError') setMicError(MIC_DENIED);
          else if (name === 'NotFoundError') setMicError(MIC_MISSING);
          else setMicError(MIC_FAILED);
        },
      )
      .finally(() => {
        micBusyRef.current = false;
        if (roomRef.current !== room) return;
        setMicBusy(false);
        setMicEnabled(room.localParticipant.isMicrophoneEnabled);
        setParticipants(listParticipants(room));
      });
  }, []);

  const unlockAudio = useCallback(() => {
    void roomRef.current?.startAudio();
  }, []);

  const hangUp = useCallback(() => {
    teardownRef.current?.();
    teardownRef.current = null;
    setStatus('ended');
  }, []);

  return { status, error, participants, micEnabled, micBusy, micError, needsAudioUnlock, toggleMic, unlockAudio, hangUp };
}
