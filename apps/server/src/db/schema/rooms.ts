// Таблицы МОДУЛЯ «Голосовые комнаты». Знают только анонимную персону, но не аккаунт и не профиль.

import { integer, pgTable, primaryKey, text, unique, uuid } from 'drizzle-orm/pg-core';
import { id, time } from './columns';

// ---------- Расписание ----------

export const slots = pgTable('room_slots', {
  id: id(),
  title: text('title').notNull(),
  startsAt: time('starts_at').notNull().unique(),
  durationMinutes: integer('duration_minutes').notNull(),
  status: text('status', { enum: ['scheduled', 'cancelled'] })
    .notNull()
    .default('scheduled'),
  createdAt: time('created_at').notNull(),
});

// Отметка «напоминание по слоту уже отправлено», чтобы не слать дважды
export const slotReminders = pgTable(
  'room_slot_reminders',
  {
    slotId: uuid('slot_id')
      .notNull()
      .references(() => slots.id, { onDelete: 'cascade' }),
    minutesBefore: integer('minutes_before').notNull(),
    sentAt: time('sent_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.slotId, table.minutesBefore] })],
);

// ---------- Анонимная персона комнат: то, что видят собеседники ----------

export const personas = pgTable('room_personas', {
  id: id(),
  nickname: text('nickname'),
  nicknameKey: text('nickname_key').unique(),
  nicknameChangedAt: time('nickname_changed_at'),
  createdAt: time('created_at').notNull(),
});

// ---------- Комнаты: знают только персону, не аккаунт ----------

export const rooms = pgTable(
  'rooms',
  {
    id: id(),
    slotId: uuid('slot_id')
      .notNull()
      .references(() => slots.id, { onDelete: 'cascade' }),
    index: integer('index').notNull(),
    // Имя комнаты на сервере звука; случайное, чтобы его нельзя было угадать
    voiceRoomName: text('voice_room_name').notNull().unique(),
    openedAt: time('opened_at').notNull(),
    closedAt: time('closed_at'),
  },
  (table) => [unique().on(table.slotId, table.index)],
);

export const roomParticipations = pgTable('room_participations', {
  id: id(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id')
    .notNull()
    .references(() => personas.id, { onDelete: 'cascade' }),
  joinedAt: time('joined_at').notNull(),
  leftAt: time('left_at'),
});
