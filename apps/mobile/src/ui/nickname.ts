// Публичный никнейм в соцсети (@ivan.petrov). Чистая часть: правила и проверка.
// К анонимному нику в голосовых комнатах НЕ относится никак: это разные вещи, они нигде не пересекаются.

export const NICK_MIN = 3;
export const NICK_MAX = 20;

export const NICK_RULES = `Латиница строчными, цифры, точка и подчёркивание, от ${NICK_MIN} до ${NICK_MAX} знаков`;

// Убирает @ и пробелы, приводит к строчным
export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

// Здесь только правила записи. Занят ли никнейм, отвечает сервер (checkUsername в lib/api)
export type NicknameCheck = { ok: true; value: string } | { ok: false; value: string; reason: string };

export function checkNickname(raw: string): NicknameCheck {
  const value = normalizeNickname(raw);
  if (value.length < NICK_MIN || value.length > NICK_MAX) return { ok: false, value, reason: `От ${NICK_MIN} до ${NICK_MAX} знаков` };
  if (!/^[a-z0-9._]+$/.test(value)) return { ok: false, value, reason: 'Только латиница, цифры, точка и подчёркивание' };
  return { ok: true, value };
}
