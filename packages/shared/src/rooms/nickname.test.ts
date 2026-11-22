import { describe, expect, it } from 'vitest';
import { checkNickname, nicknameKey } from './nickname';

describe('checkNickname', () => {
  it.each(['Кот', 'night_owl', 'Ёжик2026', 'a'.repeat(20)])('принимает «%s»', (nickname) => {
    expect(checkNickname(nickname)).toBeNull();
  });

  it('отклоняет слишком короткий и слишком длинный', () => {
    expect(checkNickname('ab')).toBe('too_short');
    expect(checkNickname('a'.repeat(21))).toBe('too_long');
  });

  it('отклоняет пробелы, знаки и эмодзи', () => {
    expect(checkNickname('два слова')).toBe('bad_characters');
    expect(checkNickname('nick!')).toBe('bad_characters');
    expect(checkNickname('кот🐱')).toBe('bad_characters');
  });

  it('отклоняет служебные имена в любом регистре', () => {
    expect(checkNickname('Admin')).toBe('reserved');
    expect(checkNickname('МОДЕРАТОР')).toBe('reserved');
  });

  it('обрезает пробелы по краям', () => {
    expect(checkNickname('  Кот  ')).toBeNull();
  });
});

describe('nicknameKey', () => {
  it('не различает регистр и букву ё', () => {
    expect(nicknameKey('Ёжик')).toBe(nicknameKey('ежик'));
  });
});
