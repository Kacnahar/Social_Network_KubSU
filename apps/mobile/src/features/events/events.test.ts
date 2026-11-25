import { describe, expect, it } from 'vitest';
import { filterEvents, formatEventDate, upcoming, type UniEvent } from './events';

const now = new Date(2026, 10, 24, 12, 0);
const event = (id: string, day: number, hour = 18, month = 10): UniEvent => ({ eventId: id, title: id, startsAt: new Date(2026, month, day, hour).toISOString(), place: 'КубГУ', description: '' });
const list = [event('past', 20), event('today', 24), event('soon', 27), event('far', 10, 18, 11)];

describe('афиша', () => {
  it('не показывает прошедшие дни и сортирует по времени', () => {
    expect(upcoming(list, now).map((item) => item.eventId)).toEqual(['today', 'soon', 'far']);
  });

  it('фильтрует «Сегодня», «Неделя», «Все»', () => {
    expect(filterEvents(list, 'today', now).map((item) => item.eventId)).toEqual(['today']);
    expect(filterEvents(list, 'week', now).map((item) => item.eventId)).toEqual(['today', 'soon']);
    expect(filterEvents(list, 'all', now).map((item) => item.eventId)).toEqual(['today', 'soon', 'far']);
  });

  it('пишет дату по-русски', () => {
    expect(formatEventDate(new Date(2026, 10, 28, 18, 5).toISOString())).toBe('28 ноя, 18:05');
  });
});
