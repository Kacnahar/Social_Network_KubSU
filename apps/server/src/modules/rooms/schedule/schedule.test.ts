import { slotsResponseSchema } from '@app/shared';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleConfig } from '../../../config';
import { slots } from '../../../db/schema';
import { createTestContext, type TestContext } from '../../../testing';
import { generateSlots } from './service';

const MINUTE = 60 * 1000;
// Воскресенье, 22 ноября 2026, 12:00 по Москве
const NOW = new Date('2026-11-22T09:00:00.000Z');

const schedule: ScheduleConfig = {
  weekdays: [1, 3, 5],
  hour: 20,
  minute: 0,
  utcOffsetHours: 3,
  durationMinutes: 45,
  title: 'Вечерняя комната',
  daysAhead: 14,
};

describe('расписание', () => {
  let t: TestContext;
  let token: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    t = await createTestContext();
    token = await t.register('student@example.com');
  });

  afterEach(async () => {
    await t.close();
    vi.useRealTimers();
  });

  const getSlots = async () => {
    const response = await t.app.inject({ method: 'GET', url: '/v1/rooms/slots', headers: t.authed(token) });
    expect(response.statusCode).toBe(200);
    return slotsResponseSchema.parse(response.json()).slots;
  };
  const addSlot = (startsAt: Date, extra: Partial<typeof slots.$inferInsert> = {}) =>
    t.db.insert(slots).values({ title: 'Комната', startsAt, durationMinutes: 45, createdAt: NOW, ...extra });

  describe('создание слотов по расписанию', () => {
    it('создаёт слоты по понедельникам, средам и пятницам в 20:00 по Москве на две недели вперёд', async () => {
      await generateSlots(t.db, schedule, NOW);
      const starts = (await getSlots()).map((slot) => slot.startsAt);
      expect(starts).toEqual([
        '2026-11-23T17:00:00.000Z',
        '2026-11-25T17:00:00.000Z',
        '2026-11-27T17:00:00.000Z',
        '2026-11-30T17:00:00.000Z',
        '2026-12-02T17:00:00.000Z',
        '2026-12-04T17:00:00.000Z',
      ]);
    });

    it('при повторном запуске ничего не дублирует', async () => {
      await generateSlots(t.db, schedule, NOW);
      await generateSlots(t.db, schedule, NOW);
      expect(await getSlots()).toHaveLength(6);
    });

    it('не создаёт слот на сегодня, если его время уже прошло, и создаёт, если ещё нет', async () => {
      const mondayEvening = new Date('2026-11-23T17:30:00.000Z');
      await generateSlots(t.db, schedule, mondayEvening);
      const all = await t.db.select().from(slots);
      expect(all.some((slot) => slot.startsAt.toISOString() === '2026-11-23T17:00:00.000Z')).toBe(false);

      await generateSlots(t.db, schedule, new Date('2026-11-25T16:00:00.000Z'));
      const later = await t.db.select().from(slots);
      expect(later.some((slot) => slot.startsAt.toISOString() === '2026-11-25T17:00:00.000Z')).toBe(true);
    });

    it('учитывает, что местная дата может отличаться от даты по UTC', async () => {
      // 22:30 воскресенья по UTC — это уже 01:30 понедельника по Москве
      await generateSlots(t.db, { ...schedule, hour: 1 }, new Date('2026-11-22T22:30:00.000Z'));
      const all = await t.db.select().from(slots);
      // Понедельничный слот в 01:00 уже прошёл, ближайший — среда 01:00 по Москве
      expect(all.map((slot) => slot.startsAt.toISOString()).sort()[0]).toBe('2026-11-24T22:00:00.000Z');
    });

    it('без дней недели ничего не создаёт', async () => {
      await generateSlots(t.db, { ...schedule, weekdays: [] }, NOW);
      expect(await getSlots()).toEqual([]);
    });
  });

  describe('GET /v1/slots', () => {
    it('требует входа', async () => {
      expect((await t.app.inject({ method: 'GET', url: '/v1/rooms/slots' })).statusCode).toBe(401);
    });

    it('показывает будущие и идущие комнаты по порядку, прошедшие и отменённые — нет', async () => {
      await addSlot(new Date(NOW.getTime() + 120 * MINUTE), { title: 'Позже' });
      await addSlot(new Date(NOW.getTime() - 10 * MINUTE), { title: 'Идёт' });
      await addSlot(new Date(NOW.getTime() - 50 * MINUTE), { title: 'Закончилась' });
      await addSlot(new Date(NOW.getTime() + 60 * MINUTE), { title: 'Отменена', status: 'cancelled' });

      const list = await getSlots();
      expect(list.map((slot) => [slot.title, slot.state])).toEqual([
        ['Идёт', 'live'],
        ['Позже', 'upcoming'],
      ]);
    });

    it('комната пропадает из списка ровно когда заканчивается', async () => {
      await addSlot(new Date(NOW.getTime() + MINUTE));
      vi.setSystemTime(NOW.getTime() + 45 * MINUTE);
      expect(await getSlots()).toHaveLength(1);
      vi.setSystemTime(NOW.getTime() + 46 * MINUTE + 1);
      expect(await getSlots()).toHaveLength(0);
    });

    it('отдаёт не больше 20 комнат', async () => {
      for (let index = 1; index <= 25; index++) await addSlot(new Date(NOW.getTime() + index * 60 * MINUTE));
      expect(await getSlots()).toHaveLength(20);
    });

    it('отменённый слот можно найти в базе, но не в ответе', async () => {
      await addSlot(new Date(NOW.getTime() + 60 * MINUTE));
      await t.db.update(slots).set({ status: 'cancelled' }).where(eq(slots.title, 'Комната'));
      expect(await getSlots()).toEqual([]);
    });
  });
});
