import { randomUUID } from 'node:crypto';
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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

// ---------- Зона персоны: то, что видят собеседники ----------

export const personas = pgTable('personas', {
  id: id(),
  nickname: text('nickname'),
  nicknameKey: text('nickname_key').unique(),
  nicknameChangedAt: time('nickname_changed_at'),
  createdAt: time('created_at').notNull(),
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
