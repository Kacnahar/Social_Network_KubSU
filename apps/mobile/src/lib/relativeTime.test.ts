import { describe, expect, it } from 'vitest';
import { formatPostTime } from './relativeTime';

const now = new Date(2026, 10, 22, 15, 0);
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe('formatPostTime', () => {
  it('только что', () => {
    expect(formatPostTime(minutesAgo(0.5), now)).toBe('только что');
    expect(formatPostTime(minutesAgo(-2), now)).toBe('только что');
  });

  it('минуты со склонениями', () => {
    expect(formatPostTime(minutesAgo(1), now)).toBe('1 минуту назад');
    expect(formatPostTime(minutesAgo(2), now)).toBe('2 минуты назад');
    expect(formatPostTime(minutesAgo(5), now)).toBe('5 минут назад');
    expect(formatPostTime(minutesAgo(11), now)).toBe('11 минут назад');
    expect(formatPostTime(minutesAgo(21), now)).toBe('21 минуту назад');
  });

  it('часы со склонениями в пределах сегодняшнего дня', () => {
    expect(formatPostTime(new Date(2026, 10, 22, 14, 0), now)).toBe('1 час назад');
    expect(formatPostTime(new Date(2026, 10, 22, 12, 30), now)).toBe('2 часа назад');
    expect(formatPostTime(new Date(2026, 10, 22, 10, 0), now)).toBe('5 часов назад');
  });

  it('вчера считается по календарю, а не по 24 часам', () => {
    const lateNow = new Date(2026, 10, 22, 0, 30);
    expect(formatPostTime(new Date(2026, 10, 21, 22, 0), lateNow)).toBe('вчера');
    expect(formatPostTime(new Date(2026, 10, 21, 9, 0), now)).toBe('вчера');
  });

  it('раньше — датой', () => {
    expect(formatPostTime(new Date(2026, 10, 20, 9, 0), now)).toBe('20 ноября');
    expect(formatPostTime(new Date(2026, 9, 3, 9, 0), now)).toBe('3 октября');
  });

  it('из прошлого года — датой с годом', () => {
    expect(formatPostTime(new Date(2025, 11, 31, 9, 0), now)).toBe('31 декабря 2025 г.');
  });
});
