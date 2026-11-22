import { describe, expect, it } from 'vitest';
import {
  formatBlockedUntil,
  isInFuture,
  minutesLeft,
  secondsLeft,
  voteAboutMeText,
  voteBannerText,
  voteHint,
  voteResultText,
} from './moderation';

describe('тексты голосования', () => {
  it('баннер по типу и с запасным словом', () => {
    expect(voteBannerText('kick', 'Лиса')).toBe('Голосование: выгнать Лиса на 24 часа');
    expect(voteBannerText('mute', 'Лиса')).toBe('Голосование: выключить микрофон у Лиса');
    expect(voteBannerText('kick', null)).toBe('Голосование: выгнать участника на 24 часа');
    expect(voteBannerText('mute', null)).toBe('Голосование: выключить микрофон у участника');
  });

  it('текст для того, против кого голосуют', () => {
    expect(voteAboutMeText('kick')).toBe('Участники решают, выгнать вас');
    expect(voteAboutMeText('mute')).toBe('Участники решают, выключить вам микрофон');
  });

  it('итог голосования', () => {
    expect(voteResultText({ type: 'kick', passed: true }, 'Лиса')).toBe('Решение принято: Лиса выгнан на 24 часа');
    expect(voteResultText({ type: 'mute', passed: true }, 'Лиса')).toBe('Решение принято: у Лиса выключен микрофон на 10 минут');
    expect(voteResultText({ type: 'kick', passed: false }, 'Лиса')).toBe('Голосование не набрало голосов');
    expect(voteResultText({ type: 'kick', passed: true }, null)).toBe('Решение принято: участник выгнан на 24 часа');
  });
});

describe('оставшееся время', () => {
  const now = Date.parse('2026-11-22T12:00:00.000Z');
  it('секунды и минуты округляются вверх и не уходят в минус', () => {
    expect(secondsLeft('2026-11-22T12:00:42.100Z', now)).toBe(43);
    expect(secondsLeft('2026-11-22T11:59:00.000Z', now)).toBe(0);
    expect(minutesLeft('2026-11-22T12:09:01.000Z', now)).toBe(10);
    expect(minutesLeft('2026-11-22T12:00:00.000Z', now)).toBe(0);
  });
  it('срок в будущем', () => {
    expect(isInFuture(null, now)).toBe(false);
    expect(isInFuture('2026-11-22T12:00:01.000Z', now)).toBe(true);
    expect(isInFuture('2026-11-22T12:00:00.000Z', now)).toBe(false);
  });
});

describe('подсказка к запуску голосования', () => {
  it('выгнать: нужно голосов из участников', () => {
    expect(voteHint('kick', 4)).toEqual({ text: 'Нужно 3 голоса из 4 участников', possible: true });
    expect(voteHint('kick', 10)).toEqual({ text: 'Нужно 4 голоса из 10 участников', possible: true });
    expect(voteHint('kick', 13)).toEqual({ text: 'Нужно 5 голосов из 13 участников', possible: true });
  });
  it('выгнать в маленькой комнате нельзя', () => {
    expect(voteHint('kick', 3)).toEqual({ text: 'В комнате слишком мало людей, чтобы выгнать', possible: false });
  });
  it('выключить микрофон', () => {
    expect(voteHint('mute', 5)).toEqual({ text: 'Нужно 2 голоса. Микрофон выключится на 10 минут', possible: true });
    expect(voteHint('mute', 2).possible).toBe(false);
  });
});

describe('время окончания запрета', () => {
  it('по-русски: число, месяц и время', () => {
    expect(formatBlockedUntil(new Date(2026, 10, 23, 17, 10).toISOString())).toBe('23 ноября в 17:10');
  });
});
