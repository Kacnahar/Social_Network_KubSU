import { describe, expect, it } from 'vitest';
import { fromIsoDate, toIsoDate } from './isoDate';

describe('дата для сервера', () => {
  it('туда и обратно', () => {
    expect(toIsoDate({ day: 3, month: 9, year: 2005 })).toBe('2005-09-03');
    expect(fromIsoDate('2005-09-03')).toEqual({ day: 3, month: 9, year: 2005 });
  });

  it('пустое и непонятное — null', () => {
    expect(fromIsoDate(null)).toBeNull();
    expect(fromIsoDate('03.09.2005')).toBeNull();
  });
});
