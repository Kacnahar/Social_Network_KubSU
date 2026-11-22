// Таблицы ЯДРА соцсети: аккаунт, вход, приглашения, уведомления.
// Открытый профиль соцсети появится здесь же (см. docs/DATA_MODEL.md).

import { boolean, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { MEDIA_PURPOSES, ROLES } from '@app/shared';
import { id, time } from './columns';

// ---------- Зона аккаунта: наружу не выходит ----------

export const inviteCodes = pgTable('invite_codes', {
  id: id(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  maxUses: integer('max_uses').notNull(),
  usedCount: integer('used_count').notNull().default(0),
  // Какую роль получает тот, кто зарегистрировался по этому коду
  role: text('role', { enum: ROLES }).notNull().default('student'),
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
  // Меняет только админ
  role: text('role', { enum: ROLES }).notNull(),
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

// ---------- Фото: аватары, позже — посты и истории ----------

export const mediaFiles = pgTable('media_files', {
  id: id(),
  ownerAccountId: uuid('owner_account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  purpose: text('purpose', { enum: MEDIA_PURPOSES }).notNull(),
  // Где лежит сам файл: на диске при разработке, в облачном хранилище при запуске
  storageKey: text('storage_key').notNull().unique(),
  mime: text('mime').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  bytes: integer('bytes').notNull(),
  createdAt: time('created_at').notNull(),
});

// ---------- Открытый профиль соцсети. С персоной комнат напрямую не связан ----------

export const profiles = pgTable('profiles', {
  id: id(),
  accountId: uuid('account_id')
    .notNull()
    .unique()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  avatarMediaId: uuid('avatar_media_id').references(() => mediaFiles.id, { onDelete: 'set null' }),
  faculty: text('faculty'),
  course: integer('course'),
  about: text('about'),
  createdAt: time('created_at').notNull(),
  updatedAt: time('updated_at').notNull(),
});
