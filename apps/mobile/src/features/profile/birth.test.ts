import { describe, expect, it } from 'vitest';
import { ageLabel, birthError, birthLine } from './birth';

const today = new Date(2026, 10, 23); // 23 ноября 2026

describe('дата рождения', () => {
  it('склоняет «год»', () => {
    expect(ageLabel(1)).toBe('1 год');
    expect(ageLabel(2)).toBe('2 года');
    expect(ageLabel(5)).toBe('5 лет');
    expect(ageLabel(11)).toBe('11 лет');
    expect(ageLabel(21)).toBe('21 год');
    expect(ageLabel(22)).toBe('22 года');
    expect(ageLabel(20)).toBe('20 лет');
  });
  it('строка: дата и возраст', () => {
    expect(birthLine({ day: 14, month: 3, year: 2005 }, today)).toBe('14 марта 2005 · 21 год');
    // день рождения в этом году ещё не наступил
    expect(birthLine({ day: 14, month: 12, year: 2005 }, today)).toBe('14 декабря 2005 · 20 лет');
  });
  it('не принимает будущее и возраст меньше 14', () => {
    expect(birthError({ day: 24, month: 11, year: 2026 }, today)).toMatch(/будущем/);
    expect(birthError({ day: 24, month: 11, year: 2012 }, today)).toMatch(/14/);
    expect(birthError({ day: 23, month: 11, year: 2012 }, today)).toBeNull();
    expect(birthError({ day: 14, month: 3, year: 2005 }, today)).toBeNull();
  });
});
