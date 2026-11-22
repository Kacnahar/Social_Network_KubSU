import { ROOM_JOIN_EARLY_MINUTES, type Slot } from '@app/shared';
import { and, asc, eq, gt } from 'drizzle-orm';
import type { ScheduleConfig } from '../../../config';
import type { Db } from '../../../db/client';
import { slots } from '../../../db/schema';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_SLOT_DURATION_MS = DAY;
const SLOTS_PAGE_SIZE = 20;

// Создаёт слоты по расписанию по умолчанию на ближайшие дни. Повторный вызов ничего не дублирует.
export async function generateSlots(db: Db, schedule: ScheduleConfig, now: Date): Promise<void> {
  if (schedule.weekdays.length === 0) return;
  const offsetMs = schedule.utcOffsetHours * HOUR;
  // «Местные» дата и день недели получаются, если сдвинуть время и читать его как UTC
  const localNow = new Date(now.getTime() + offsetMs);

  const rows = [];
  for (let dayOffset = 0; dayOffset <= schedule.daysAhead; dayOffset++) {
    const localStart = Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate() + dayOffset,
      schedule.hour,
      schedule.minute,
    );
    const isoWeekday = new Date(localStart).getUTCDay() || 7;
    const startsAt = new Date(localStart - offsetMs);
    if (!schedule.weekdays.includes(isoWeekday) || startsAt <= now) continue;
    rows.push({ title: schedule.title, startsAt, durationMinutes: schedule.durationMinutes, createdAt: now });
  }
  if (rows.length > 0) await db.insert(slots).values(rows).onConflictDoNothing({ target: slots.startsAt });
}

type SlotTiming = { startsAt: Date; durationMinutes: number; status: 'scheduled' | 'cancelled' };

export function slotEndsAt(slot: SlotTiming): Date {
  return new Date(slot.startsAt.getTime() + slot.durationMinutes * MINUTE);
}

// Войти можно чуть раньше начала и до самого конца
export function isJoinable(slot: SlotTiming, now: Date): boolean {
  return (
    slot.status === 'scheduled' &&
    now.getTime() >= slot.startsAt.getTime() - ROOM_JOIN_EARLY_MINUTES * MINUTE &&
    now < slotEndsAt(slot)
  );
}

// Для разработки: если сейчас войти некуда, открыть «Тестовую комнату» на два часа
export async function ensureDevLiveSlot(db: Db, now: Date): Promise<void> {
  const recent = await db
    .select()
    .from(slots)
    .where(gt(slots.startsAt, new Date(now.getTime() - MAX_SLOT_DURATION_MS)));
  if (recent.some((slot) => isJoinable(slot, now))) return;
  const startsAt = new Date(Math.floor(now.getTime() / MINUTE) * MINUTE);
  await db
    .insert(slots)
    .values({ title: 'Тестовая комната', startsAt, durationMinutes: 120, createdAt: now })
    .onConflictDoNothing({ target: slots.startsAt });
}

export async function listUpcomingSlots(db: Db, now: Date): Promise<Slot[]> {
  const rows = await db
    .select()
    .from(slots)
    .where(and(eq(slots.status, 'scheduled'), gt(slots.startsAt, new Date(now.getTime() - MAX_SLOT_DURATION_MS))))
    .orderBy(asc(slots.startsAt));

  return rows
    .filter((slot) => slot.startsAt.getTime() + slot.durationMinutes * MINUTE > now.getTime())
    .slice(0, SLOTS_PAGE_SIZE)
    .map((slot) => ({
      id: slot.id,
      title: slot.title,
      startsAt: slot.startsAt.toISOString(),
      durationMinutes: slot.durationMinutes,
      state: slot.startsAt <= now ? 'live' : 'upcoming',
      joinable: isJoinable(slot, now),
    }));
}
