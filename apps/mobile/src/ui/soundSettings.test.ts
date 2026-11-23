import { describe, expect, it } from 'vitest';
import { DEFAULT_SOUND, formatMinutes, isQuietNow, parseSound, stepMinutes } from './soundSettings';

describe('parseSound', () => {
  it('мусор заменяется значениями по умолчанию', () => {
    expect(parseSound(null)).toEqual(DEFAULT_SOUND);
    expect(parseSound({ melody: 'x', roomVolume: 'громко', dndFrom: 99999 }).melody).toBe('bell');
    expect(parseSound({ roomVolume: 250 }).roomVolume).toBe(100);
    expect(parseSound({ dndFrom: 99999 }).dndFrom).toBe(1439);
  });
  it('верные значения сохраняются', () => {
    expect(parseSound({ vibration: false, melody: 'chime', roomVolume: 30 })).toMatchObject({ vibration: false, melody: 'chime', roomVolume: 30 });
  });
});

describe('isQuietNow', () => {
  const s = { ...DEFAULT_SOUND, dndOn: true };
  it('через полночь', () => {
    expect(isQuietNow(s, new Date(2026, 10, 23, 23, 30))).toBe(true);
    expect(isQuietNow(s, new Date(2026, 10, 23, 3, 0))).toBe(true);
    expect(isQuietNow(s, new Date(2026, 10, 23, 12, 0))).toBe(false);
  });
  it('выключено — всегда громко', () => {
    expect(isQuietNow({ ...s, dndOn: false }, new Date(2026, 10, 23, 23, 30))).toBe(false);
  });
});

describe('время', () => {
  it('форматирует и ходит по кругу', () => {
    expect(formatMinutes(7 * 60 + 5)).toBe('07:05');
    expect(stepMinutes(0, -30)).toBe(1410);
    expect(stepMinutes(1430, 30)).toBe(20);
  });
});
