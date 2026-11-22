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

// ---------- Модерация комнат: всё по персоне, без аккаунта ----------

export const roomVotes = pgTable('room_votes', {
  id: id(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['kick', 'mute'] }).notNull(),
  targetPersonaId: uuid('target_persona_id')
    .notNull()
    .references(() => personas.id, { onDelete: 'cascade' }),
  initiatorPersonaId: uuid('initiator_persona_id').references(() => personas.id, { onDelete: 'set null' }),
  participantsAtStart: integer('participants_at_start').notNull(),
  votesNeeded: integer('votes_needed').notNull(),
  result: text('result', { enum: ['pending', 'passed', 'failed'] })
    .notNull()
    .default('pending'),
  startedAt: time('started_at').notNull(),
  endsAt: time('ends_at').notNull(),
  resolvedAt: time('resolved_at'),
});

// Кто голосовал — видно только в журнале для админов, собеседникам не раскрывается
export const roomVoteBallots = pgTable(
  'room_vote_ballots',
  {
    voteId: uuid('vote_id')
      .notNull()
      .references(() => roomVotes.id, { onDelete: 'cascade' }),
    voterPersonaId: uuid('voter_persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
    createdAt: time('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.voteId, table.voterPersonaId] })],
);

// mute — выключен микрофон в одной комнате; room_block — выгнали, вход во все комнаты закрыт;
// rooms_ban — автобан после нескольких выгонов. Привязано к персоне: смена ника не помогает.
export const roomSanctions = pgTable('room_sanctions', {
  id: id(),
  personaId: uuid('persona_id')
    .notNull()
    .references(() => personas.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['mute', 'room_block', 'rooms_ban'] }).notNull(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  source: text('source', { enum: ['vote', 'auto'] }).notNull(),
  startsAt: time('starts_at').notNull(),
  endsAt: time('ends_at').notNull(),
  // Для mute: когда микрофон вернули на сервере звука
  liftedAt: time('lifted_at'),
});

export const roomPersonalMutes = pgTable(
  'room_personal_mutes',
  {
    personaId: uuid('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
    mutedPersonaId: uuid('muted_persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
    createdAt: time('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.personaId, table.mutedPersonaId] })],
);

export const roomReports = pgTable('room_reports', {
  id: id(),
  reporterPersonaId: uuid('reporter_persona_id').references(() => personas.id, { onDelete: 'set null' }),
  targetPersonaId: uuid('target_persona_id').references(() => personas.id, { onDelete: 'set null' }),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  text: text('text').notNull(),
  status: text('status', { enum: ['new', 'closed'] })
    .notNull()
    .default('new'),
  createdAt: time('created_at').notNull(),
});
