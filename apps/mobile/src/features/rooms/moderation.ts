// Чистая логика модерации комнат: тексты и расчёт времени, чтобы проверять её тестами
import { KICK_BLOCK_HOURS, MUTE_MINUTES, voteIsPossible, votesNeeded, type VoteType } from '@app/shared';
import { plural } from './slotTime';

const KICK_FOR = `${KICK_BLOCK_HOURS} ${plural(KICK_BLOCK_HOURS, 'час', 'часа', 'часов')}`;
const MUTE_FOR = `${MUTE_MINUTES} ${plural(MUTE_MINUTES, 'минуту', 'минуты', 'минут')}`;
const MUTE_FOR_GEN = `${MUTE_MINUTES} ${plural(MUTE_MINUTES, 'минута', 'минуты', 'минут')}`;

export const NO_VOTES_TEXT = 'Голосование не набрало голосов';
export const VOTE_BUSY_HINT = 'Сначала закончится текущее голосование';

export function voteBannerText(type: VoteType, name: string | null): string {
  const who = name ?? 'участника';
  return type === 'kick' ? `Голосование: выгнать ${who} на ${KICK_FOR}` : `Голосование: выключить микрофон у ${who}`;
}

export function voteAboutMeText(type: VoteType): string {
  return type === 'kick' ? 'Участники решают, выгнать вас' : 'Участники решают, выключить вам микрофон';
}

export function voteResultText(result: { type: VoteType; passed: boolean }, name: string | null): string {
  if (!result.passed) return NO_VOTES_TEXT;
  if (result.type === 'kick') return `Решение принято: ${name ?? 'участник'} выгнан на ${KICK_FOR}`;
  return `Решение принято: у ${name ?? 'участника'} выключен микрофон на ${MUTE_FOR_GEN}`;
}

// Секунды округляем вверх: «0 с» не показываем, пока голосование ещё идёт
export function secondsLeft(untilIso: string, nowMs: number): number {
  return Math.max(0, Math.ceil((new Date(untilIso).getTime() - nowMs) / 1000));
}

export function minutesLeft(untilIso: string, nowMs: number): number {
  return Math.max(0, Math.ceil((new Date(untilIso).getTime() - nowMs) / 60_000));
}

export function isInFuture(untilIso: string | null, nowMs: number): boolean {
  return untilIso !== null && new Date(untilIso).getTime() > nowMs;
}

export function votesWord(count: number): string {
  return `${count} ${plural(count, 'голос', 'голоса', 'голосов')}`;
}

// Подсказка под кнопкой запуска голосования; possible — можно ли вообще его начать
export function voteHint(type: VoteType, participants: number): { text: string; possible: boolean } {
  if (!voteIsPossible(type, participants)) {
    return {
      text: type === 'kick' ? 'В комнате слишком мало людей, чтобы выгнать' : 'В комнате слишком мало людей, чтобы выключить микрофон',
      possible: false,
    };
  }
  const needed = votesNeeded(type, participants);
  if (type === 'kick') {
    return { text: `Нужно ${votesWord(needed)} из ${participants} ${plural(participants, 'участника', 'участников', 'участников')}`, possible: true };
  }
  return { text: `Нужно ${votesWord(needed)}. Микрофон выключится на ${MUTE_FOR}`, possible: true };
}

export function kickButtonTitle(): string {
  return `Выгнать на ${KICK_FOR}`;
}

const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const clockFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

// «23 ноября в 17:10»
export function formatBlockedUntil(untilIso: string): string {
  const date = new Date(untilIso);
  return `${dayFormat.format(date)} в ${clockFormat.format(date)}`;
}
