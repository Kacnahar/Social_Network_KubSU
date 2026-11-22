export type CallStatus = 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'error';

export type CallParticipant = { id: string; name: string; isMe: boolean; isSpeaking: boolean; isMuted: boolean;
  // Я заглушил этого человека только для себя; остальные его слышат
  isLocallyMuted: boolean;
};

export type Call = {
  status: CallStatus;
  error: string | null;
  // Я — первым, дальше говорящие, потом остальные по имени
  participants: CallParticipant[];
  micEnabled: boolean;
  micBusy: boolean;
  micError: string | null;
  // Браузер не даёт играть звук без нажатия
  needsAudioUnlock: boolean;
  toggleMic: () => void;
  unlockAudio: () => void;
  // Те, кого я не хочу слышать; применяется и к тем, кто подключится позже
  setLocallyMuted: (participantIds: string[]) => void;
  // Разорвать соединение; запрос на выход отправляет сам экран
  hangUp: () => void;
};
