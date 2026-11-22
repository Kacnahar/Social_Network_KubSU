import { randomUUID } from 'node:crypto';
import { boolean, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().$defaultFn(() => randomUUID());
const time = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

// ---------- Зона аккаунта: наружу не выходит ----------

export const inviteCodes = pgTable('invite_codes', {
  id: id(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  maxUses: integer('max_uses').notNull(),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: time('expires_at'),
  createdAt: time('created_at').notNull(),
});

export const accounts = pgTable('accounts', {
  id: id(),
  emailEncrypted: text('email_encrypted').notNull(),
  emailHash: text('email_hash').notNull().unique(),
  inviteCodeId: uuid('invite_code_id')
    .notNull()
    .references(() => inviteCodes.id),
  status: text('status', { enum: ['active', 'banned'] })
    .notNull()
    .default('active'),
  bannedUntil: time('banned_until'),
  createdAt: time('created_at').notNull(),
});

export const emailLoginCodes = pgTable('email_login_codes', {
  emailHash: text('email_hash').primaryKey(),
  codeHash: text('code_hash').notNull(),
  inviteCodeId: uuid('invite_code_id').references(() => inviteCodes.id),
  // false — письмо не отправлялось (аккаунта нет), код заведомо не подойдёт
  deliverable: boolean('deliverable').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: time('expires_at').notNull(),
  createdAt: time('created_at').notNull(),
});

export const sessions = pgTable('sessions', {
  id: id(),
  tokenHash: text('token_hash').notNull().unique(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  expiresAt: time('expires_at').notNull(),
  createdAt: time('created_at').notNull(),
});

// Адрес для push-уведомлений в браузере. Привязан к аккаунту, наружу не отдаётся
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: id(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['webpush'] }).notNull(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: time('created_at').notNull(),
});

// ---------- Расписание ----------

export const slots = pgTable('slots', {
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
  'slot_reminders',
  {
    slotId: uuid('slot_id')
      .notNull()
      .references(() => slots.id, { onDelete: 'cascade' }),
    minutesBefore: integer('minutes_before').notNull(),
    sentAt: time('sent_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.slotId, table.minutesBefore] })],
);

// ---------- Зона персоны: то, что видят собеседники ----------

export const personas = pgTable('personas', {
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

// ---------- Мост «аккаунт ↔ персона». Читать только из модуля identity ----------

export const personaLinks = pgTable('persona_links', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id')
    .notNull()
    .unique()
    .references(() => personas.id, { onDelete: 'cascade' }),
});
