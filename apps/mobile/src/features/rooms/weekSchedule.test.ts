import type { Slot } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { dayLabel, formatClock, groupSlotsByDay } from './weekSchedule';

const now = new Date(2026, 10, 22, 18, 0); // 22 ноября 2026, 18:00
const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0);
const slot = (id: string, startsAt: Date, state: Slot['state'] = 'upcoming'): Slot => ({
  id,
  title: id,
  startsAt: startsAt.toISOString(),
  durationMinutes: 60,
  state,
  joinable: state === 'live',
});

describe('dayLabel', () => {
  it('называет ближайшие дни словами', () => {
    expect(dayLabel(at(22, 20), now)).toBe('Сегодня');
    expect(dayLabel(at(23, 9), now)).toBe('Завтра');
    expect(dayLabel(at(25, 20), now)).toBe('среда, 25 ноября');
  });
});

describe('formatClock', () => {
  it('пишет часы и минуты с нулями', () => {
    expect(formatClock(new Date(2026, 10, 22, 9, 5))).toBe('09:05');
  });
});

describe('groupSlotsByDay', () => {
  it('группирует по дням в порядке начала', () => {
    const groups = groupSlotsByDay([slot('c', at(23, 20)), slot('a', at(22, 20)), slot('b', at(22, 22))], now);
    expect(groups.map((group) => group.label)).toEqual(['Сегодня', 'Завтра']);
    expect(groups[0]?.slots.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('показывает только ближайшую неделю', () => {
    const groups = groupSlotsByDay([slot('near', at(28, 20)), slot('far', at(29, 20))], now);
    expect(groups.flatMap((group) => group.slots.map((item) => item.id))).toEqual(['near']);
  });

  it('идущую со вчера комнату относит к сегодня', () => {
    const groups = groupSlotsByDay([slot('live', at(21, 23), 'live')], now);
    expect(groups[0]?.label).toBe('Сегодня');
  });

  it('пустое расписание — пустой список', () => {
    expect(groupSlotsByDay([], now)).toEqual([]);
  });
});
