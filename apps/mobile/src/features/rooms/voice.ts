// Заглушка для iOS и Android: звонки в приложении появятся позже, пока работает только веб
import type { Call } from './voiceTypes';

export const voiceSupported = false;

const UNSUPPORTED = 'Звонки в приложении появятся позже. Пока откройте комнату в браузере';

const noop = () => undefined;

const call: Call = {
  status: 'error',
  error: UNSUPPORTED,
  participants: [],
  micEnabled: false,
  micBusy: false,
  micError: null,
  needsAudioUnlock: false,
  toggleMic: noop,
  unlockAudio: noop,
  setLocallyMuted: noop,
  hangUp: noop,
};

export function useCall(_connection: { voiceUrl: string; voiceToken: string } | null): Call {
  return call;
}
