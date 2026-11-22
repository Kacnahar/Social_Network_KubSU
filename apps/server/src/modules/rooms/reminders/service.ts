import { and, eq, gt, lte } from 'drizzle-orm';
import type { Db } from '../../../db/client';
import { slotReminders, slots } from '../../../db/schema';
import { broadcastPush, type PushGateway } from '../../../core/push/service';

const MINUTE = 60 * 1000;

// Напоминание уходит, только пока оно ещё правдиво: «через час» не шлём за 20 минут до начала
const REMINDERS = [
  { minutesBefore: 5, fromMinutes: 0, body: 'Комната начнётся через 5 минут' },
  { minutesBefore: 60, fromMinutes: 45, body: 'Комната начнётся через час' },
] as const;

export type ReminderDeps = {
  db: Db;
  push: PushGateway;
  onError: (error: unknown) => void;
};

// Вызывается раз в полминуты. Безопасно при повторах и при нескольких копиях сервера.
export async function runReminderTick(deps: ReminderDeps, now: Date): Promise<void> {
  const soon = await deps.db
    .select()
    .from(slots)
    .where(
      and(eq(slots.status, 'scheduled'), gt(slots.startsAt, now), lte(slots.startsAt, new Date(now.getTime() + 60 * MINUTE))),
    );

  for (const slot of soon) {
    const minutesLeft = (slot.startsAt.getTime() - now.getTime()) / MINUTE;
    const reminder = REMINDERS.find((item) => minutesLeft <= item.minutesBefore && minutesLeft > item.fromMinutes);
    if (!reminder) continue;

    // Кто первым записал отметку, тот и отправляет
    const [claimed] = await deps.db
      .insert(slotReminders)
      .values({ slotId: slot.id, minutesBefore: reminder.minutesBefore, sentAt: now })
      .onConflictDoNothing()
      .returning({ slotId: slotReminders.slotId });
    if (!claimed) continue;

    await broadcastPush(deps, { title: slot.title, body: reminder.body, url: '/' }, minutesLeft * 60, now, 'rooms');
  }
}
