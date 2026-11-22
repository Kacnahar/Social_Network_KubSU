export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;
export const NICKNAME_CHANGE_INTERVAL_DAYS = 30;

const NICKNAME_PATTERN = /^[A-Za-zА-Яа-яЁё0-9_]+$/;

const RESERVED = ['admin', 'administrator', 'moderator', 'support', 'system', 'админ', 'администратор', 'модератор', 'поддержка', 'система'];

export type NicknameProblem = 'too_short' | 'too_long' | 'bad_characters' | 'reserved';

export function normalizeNickname(raw: string): string {
  return raw.trim();
}

// Ключ для проверки уникальности: «Ёжик» и «ежик» считаются одним ником
export function nicknameKey(nickname: string): string {
  return normalizeNickname(nickname).toLowerCase().replaceAll('ё', 'е');
}

export function checkNickname(raw: string): NicknameProblem | null {
  const nickname = normalizeNickname(raw);
  if (nickname.length < NICKNAME_MIN_LENGTH) return 'too_short';
  if (nickname.length > NICKNAME_MAX_LENGTH) return 'too_long';
  if (!NICKNAME_PATTERN.test(nickname)) return 'bad_characters';
  if (RESERVED.includes(nicknameKey(nickname))) return 'reserved';
  return null;
}

export const NICKNAME_PROBLEM_TEXT: Record<NicknameProblem, string> = {
  too_short: `Ник должен быть не короче ${NICKNAME_MIN_LENGTH} символов`,
  too_long: `Ник должен быть не длиннее ${NICKNAME_MAX_LENGTH} символов`,
  bad_characters: 'В нике можно использовать только буквы, цифры и знак «_»',
  reserved: 'Этот ник занят',
};
