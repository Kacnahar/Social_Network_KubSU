import type { PushMessage } from '@rooms/shared';
import { and, eq, gt, inArray, lte } from 'drizzle-orm';
import type { Db } from '../db/client';
import { accounts, pushSubscriptions, slotReminders, slots } from '../db/schema';
import type { PushGateway } from '../push/service';

const MINUTE = 60 * 1000;
const SEND_BATCH_SIZE = 20;

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

async function activeTargets(db: Db, now: Date) {
  const rows = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      status: accounts.status,
      bannedUntil: accounts.bannedUntil,
    })
    .from(pushSubscriptions)
    .innerJoin(accounts, eq(accounts.id, pushSubscriptions.accountId));
  return rows.filter((row) => row.status === 'active' || (row.bannedUntil !== null && row.bannedUntil <= now));
}

async function sendToAll(deps: ReminderDeps, message: PushMessage, ttlSeconds: number, now: Date): Promise<void> {
  const targets = await activeTargets(deps.db, now);
  const gone: string[] = [];
  for (let index = 0; index < targets.length; index += SEND_BATCH_SIZE) {
    const batch = targets.slice(index, index + SEND_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((target) => deps.push.send(target, message, ttlSeconds)));
    results.forEach((result, position) => {
      if (result.status === 'rejected') deps.onError(result.reason);
      else if (result.value === 'gone') gone.push(batch[position]!.endpoint);
    });
  }
  if (gone.length > 0) await deps.db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, gone));
}

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

    await sendToAll(deps, { title: slot.title, body: reminder.body, url: '/' }, minutesLeft * 60, now);
  }
}
