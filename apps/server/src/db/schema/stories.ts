// Таблицы МОДУЛЯ «Истории». Работают с открытым профилем; о комнатах и персоне ничего не знают.

import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { id, time } from './columns';
import { mediaFiles, profiles } from './core';

export const stories = pgTable('stories', {
  id: id(),
  authorProfileId: uuid('author_profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  mediaId: uuid('media_id')
    .notNull()
    .unique()
    .references(() => mediaFiles.id, { onDelete: 'cascade' }),
  caption: text('caption').notNull(),
  createdAt: time('created_at').notNull(),
  // Через 24 часа после публикации; после этого история не отдаётся ни одним запросом
  expiresAt: time('expires_at').notNull(),
});

export const storyViews = pgTable(
  'story_views',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    viewerProfileId: uuid('viewer_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    viewedAt: time('viewed_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.storyId, table.viewerProfileId] })],
);
