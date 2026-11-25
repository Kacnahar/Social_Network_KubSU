import { describe, expect, it } from 'vitest';
import { firstNameOf, greetingFor } from './greetingText';

const at = (hour: number, minute = 0) => new Date(2026, 10, 24, hour, minute);

describe('приветствие', () => {
  it('меняется по времени суток на границах', () => {
    expect(greetingFor(at(4, 59), 'Иван')).toBe('Доброй ночи, Иван');
    expect(greetingFor(at(5), 'Иван')).toBe('Доброе утро, Иван');
    expect(greetingFor(at(11, 59), 'Иван')).toBe('Доброе утро, Иван');
    expect(greetingFor(at(12), 'Иван')).toBe('Добрый день, Иван');
    expect(greetingFor(at(16, 59), 'Иван')).toBe('Добрый день, Иван');
    expect(greetingFor(at(17), 'Иван')).toBe('Добрый вечер, Иван');
    expect(greetingFor(at(22, 59), 'Иван')).toBe('Добрый вечер, Иван');
    expect(greetingFor(at(23), 'Иван')).toBe('Доброй ночи, Иван');
    expect(greetingFor(at(0), 'Иван')).toBe('Доброй ночи, Иван');
  });

  it('гостю — без имени', () => {
    expect(greetingFor(at(14), null)).toBe('Добрый день');
  });

  it('берёт имя из «Имя Фамилия», гостю имя не даёт', () => {
    expect(firstNameOf('Иван Петров', false)).toBe('Иван');
    expect(firstNameOf('  Анна  ', false)).toBe('Анна');
    expect(firstNameOf('Иван Петров', true)).toBeNull();
    expect(firstNameOf(undefined, false)).toBeNull();
  });
});
