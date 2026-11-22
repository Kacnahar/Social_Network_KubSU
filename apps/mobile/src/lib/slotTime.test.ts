import { describe, expect, it } from 'vitest';
import { formatMinutesLeft, formatSlotStart, formatTimeUntil } from './slotTime';

const now = new Date(2026, 10, 22, 12, 0);
const minutesLater = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

describe('formatSlotStart', () => {
  it('сегодня', () => {
    expect(formatSlotStart(new Date(2026, 10, 22, 20, 0), now)).toBe('сегодня в 20:00');
  });

  it('завтра', () => {
    expect(formatSlotStart(new Date(2026, 10, 23, 9, 5), now)).toBe('завтра в 09:05');
  });

  it('граница суток: завтра считается по календарю, а не по 24 часам', () => {
    const lateNow = new Date(2026, 10, 22, 23, 30);
    expect(formatSlotStart(new Date(2026, 10, 23, 0, 10), lateNow)).toBe('завтра в 00:10');
  });

  it('позже — с днём недели и датой', () => {
    expect(formatSlotStart(new Date(2026, 10, 24, 20, 0), now)).toBe('вт, 24 ноября в 20:00');
  });
});

describe('formatTimeUntil', () => {
  it('меньше минуты', () => {
    expect(formatTimeUntil(minutesLater(0.5), now)).toBe('вот-вот начнётся');
    expect(formatTimeUntil(minutesLater(-3), now)).toBe('вот-вот начнётся');
  });

  it('минуты со склонениями', () => {
    expect(formatTimeUntil(minutesLater(1), now)).toBe('через 1 минуту');
    expect(formatTimeUntil(minutesLater(2), now)).toBe('через 2 минуты');
    expect(formatTimeUntil(minutesLater(5), now)).toBe('через 5 минут');
    expect(formatTimeUntil(minutesLater(11), now)).toBe('через 11 минут');
    expect(formatTimeUntil(minutesLater(21), now)).toBe('через 21 минуту');
  });

  it('часы со склонениями', () => {
    expect(formatTimeUntil(minutesLater(60), now)).toBe('через 1 час');
    expect(formatTimeUntil(minutesLater(150), now)).toBe('через 2 часа');
    expect(formatTimeUntil(minutesLater(5 * 60), now)).toBe('через 5 часов');
  });

  it('дни со склонениями', () => {
    expect(formatTimeUntil(minutesLater(24 * 60), now)).toBe('через 1 день');
    expect(formatTimeUntil(minutesLater(3 * 24 * 60), now)).toBe('через 3 дня');
    expect(formatTimeUntil(minutesLater(5 * 24 * 60), now)).toBe('через 5 дней');
  });
});

describe('formatMinutesLeft', () => {
  it('округляет вверх', () => {
    expect(formatMinutesLeft(new Date(now.getTime() + 61_000), now)).toBe('2 мин');
  });

  it('не уходит в минус', () => {
    expect(formatMinutesLeft(minutesLater(-3), now)).toBe('0 мин');
  });
});
