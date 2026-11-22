import type { Slot } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { describeRooms } from './roomStatus';

const now = new Date(2026, 10, 22, 12, 0);
const slot = (patch: Partial<Slot>): Slot => ({
  id: 's1',
  title: 'Вечерняя',
  startsAt: new Date(2026, 10, 22, 20, 0).toISOString(),
  durationMinutes: 60,
  state: 'upcoming',
  joinable: false,
  ...patch,
});

describe('describeRooms', () => {
  it('загрузка', () => {
    expect(describeRooms({ status: 'loading' }).kind).toBe('loading');
  });

  it('ошибка и пустое расписание — «комнат нет»', () => {
    expect(describeRooms({ status: 'error', message: 'x' }).kind).toBe('none');
    expect(describeRooms({ status: 'ready', slots: [], now }).kind).toBe('none');
  });

  it('идёт сейчас и можно войти', () => {
    expect(describeRooms({ status: 'ready', slots: [slot({ state: 'live', joinable: true })], now }).kind).toBe('live');
  });

  it('вход открыт до начала', () => {
    expect(describeRooms({ status: 'ready', slots: [slot({ joinable: true })], now }).kind).toBe('open');
  });

  it('рано входить — ждём начала', () => {
    const status = describeRooms({ status: 'ready', slots: [slot({})], now });
    expect(status.kind).toBe('later');
    expect(status.next?.id).toBe('s1');
  });
});
