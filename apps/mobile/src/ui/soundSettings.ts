// Настройки звука: чистая часть (значения по умолчанию, проверка сохранённого, «Не беспокоить»). Без экранов и памяти

export type Melody = 'bell' | 'drop' | 'chime' | 'pulse' | 'soft';

export const MELODIES: { value: Melody; label: string; hz: number[] }[] = [
  { value: 'bell', label: 'Колокольчик', hz: [880, 1175] },
  { value: 'drop', label: 'Капля', hz: [660, 440] },
  { value: 'chime', label: 'Перезвон', hz: [523, 659, 784] },
  { value: 'pulse', label: 'Пульс', hz: [440, 440] },
  { value: 'soft', label: 'Мягкий сигнал', hz: [392, 523] },
];

export type SoundSettings = {
  notifySound: boolean;
  melody: Melody;
  vibration: boolean;
  messageIn: boolean;
  messageOut: boolean;
  roomJoin: boolean;
  // Громкость собеседников, 0–100
  roomVolume: number;
  uiSounds: boolean;
  dndOn: boolean;
  // Минуты от полуночи: «с» и «до»
  dndFrom: number;
  dndTo: number;
};

export const DEFAULT_SOUND: SoundSettings = {
  notifySound: true,
  melody: 'bell',
  vibration: true,
  messageIn: true,
  messageOut: true,
  roomJoin: true,
  roomVolume: 80,
  uiSounds: true,
  dndOn: false,
  dndFrom: 23 * 60,
  dndTo: 7 * 60,
};

const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
const minutes = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1439, Math.max(0, Math.round(value))) : fallback;

// Сохранённое могло испортиться или устареть: что не подходит — берём по умолчанию
export function parseSound(raw: unknown): SoundSettings {
  const d = DEFAULT_SOUND;
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  return {
    notifySound: bool(r.notifySound, d.notifySound),
    melody: MELODIES.some((m) => m.value === r.melody) ? (r.melody as Melody) : d.melody,
    vibration: bool(r.vibration, d.vibration),
    messageIn: bool(r.messageIn, d.messageIn),
    messageOut: bool(r.messageOut, d.messageOut),
    roomJoin: bool(r.roomJoin, d.roomJoin),
    roomVolume: typeof r.roomVolume === 'number' && Number.isFinite(r.roomVolume) ? Math.min(100, Math.max(0, Math.round(r.roomVolume))) : d.roomVolume,
    uiSounds: bool(r.uiSounds, d.uiSounds),
    dndOn: bool(r.dndOn, d.dndOn),
    dndFrom: minutes(r.dndFrom, d.dndFrom),
    dndTo: minutes(r.dndTo, d.dndTo),
  };
}

// Сейчас тихие часы? Промежуток может переходить через полночь (23:00 — 07:00)
export function isQuietNow(settings: SoundSettings, now: Date): boolean {
  if (!settings.dndOn || settings.dndFrom === settings.dndTo) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return settings.dndFrom < settings.dndTo ? t >= settings.dndFrom && t < settings.dndTo : t >= settings.dndFrom || t < settings.dndTo;
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Шаг по времени — полчаса, по кругу суток
export const stepMinutes = (value: number, delta: number): number => (((value + delta) % 1440) + 1440) % 1440;
