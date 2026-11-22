// Таблицы МОДУЛЯ «Посты». Работают с открытым профилем; о комнатах и персоне ничего не знают.

import { integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { id, time } from './columns';
import { mediaFiles, profiles } from './core';

export const posts = pgTable('posts', {
  id: id(),
  authorProfileId: uuid('author_profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: time('created_at').notNull(),
});

export const postPhotos = pgTable(
  'post_photos',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .unique()
      .references(() => mediaFiles.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.position] })],
);

export const postLikes = pgTable(
  'post_likes',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: time('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.profileId] })],
);

export const postComments = pgTable('post_comments', {
  id: id(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  authorProfileId: uuid('author_profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: time('created_at').notNull(),
});

// Жалобы на посты и комментарии. Разбирать их будет админ (админка — позже)
export const postReports = pgTable('post_reports', {
  id: id(),
  reporterProfileId: uuid('reporter_profile_id').references(() => profiles.id, { onDelete: 'set null' }),
  targetType: text('target_type', { enum: ['post', 'comment'] }).notNull(),
  // Без внешнего ключа: жалоба должна пережить удаление самой записи автором
  targetId: uuid('target_id').notNull(),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['new', 'closed'] })
    .notNull()
    .default('new'),
  createdAt: time('created_at').notNull(),
});
