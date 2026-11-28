import type { ScheduleConfig } from '../../config';
import type { Db } from '../../db/client';
import type { PushGateway } from '../../core/push/service';
import { runReminderTick } from './reminders/service';
import { closeFinishedRooms } from './entry/service';
import { liftExpiredMutes } from './moderation/service';
import { syncPresence } from './presence/service';
import type { VoiceGateway } from './voice/gateway';
import { generateSlots } from './schedule/service';

// Раз в 15 секунд: напоминания, закрытие комнат, сверка присутствия
const REMINDER_TICK_MS = 15 * 1000;
const SLOT_GENERATION_MS = 60 * 60 * 1000;

type JobDeps = {
  db: Db;
  schedule: ScheduleConfig;
  push: PushGateway | null;
  voice: VoiceGateway | null;
  onError: (error: unknown) => void;
};

// Фоновые задачи сервера: пополнять расписание, рассылать напоминания, закрывать закончившиеся комнаты
export async function startBackgroundJobs({ db, schedule, push, voice, onError }: JobDeps): Promise<() => void> {
  await generateSlots(db, schedule, new Date());
  const slotTimer = setInterval(() => {
    generateSlots(db, schedule, new Date()).catch(onError);
  }, SLOT_GENERATION_MS);

  let ticking = false;
  const reminderTimer = setInterval(() => {
    if (ticking) return;
    ticking = true;
    const now = new Date();
    Promise.all([
      push ? runReminderTick({ db, push, onError }, now).catch(onError) : undefined,
      // Сначала закрываем закончившиеся комнаты и возвращаем микрофоны, потом сверяем, кто на самом деле в комнатах
      closeFinishedRooms({ db, voice, onError }, now)
        .then(() => liftExpiredMutes({ db, voice, onError }, now))
        .then(() => syncPresence({ db, voice, onError }, now))
        .catch(onError),
    ])
      .finally(() => {
        ticking = false;
      });
  }, REMINDER_TICK_MS);

  return () => {
    clearInterval(slotTimer);
    clearInterval(reminderTimer);
  };
}
