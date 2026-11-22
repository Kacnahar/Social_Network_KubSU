import {
  STORY_TTL_HOURS,
  mediaPath,
  type Author,
  type StoriesResponse,
  type Story,
  type StoryGroup,
  type StoryViewersResponse,
} from '@app/shared';
import { and, asc, desc, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import { ApiError } from '../../core/errors';
import { deleteMedia, type MediaDeps } from '../../core/media/service';
import type { ProfileRef } from '../../core/profile/service';
import type { Db } from '../../db/client';
import { accounts, mediaFiles, profiles, stories, storyViews } from '../../db/schema';

const TTL_MS = STORY_TTL_HOURS * 60 * 60 * 1000;
const storyNotFound = () => new ApiError(404, 'not_found', 'Такой истории нет');

type StoryRow = typeof stories.$inferSelect;

async function loadAuthors(db: Db, profileIds: string[]): Promise<Map<string, Author>> {
  if (profileIds.length === 0) return new Map();
  const rows = await db
    .select({ id: profiles.id, displayName: profiles.displayName, avatarMediaId: profiles.avatarMediaId, role: accounts.role })
    .from(profiles)
    .innerJoin(accounts, eq(accounts.id, profiles.accountId))
    .where(inArray(profiles.id, [...new Set(profileIds)]));
  return new Map(
    rows.map((row) => [
      row.id,
      { profileId: row.id, displayName: row.displayName, avatarUrl: row.avatarMediaId ? mediaPath(row.avatarMediaId) : null, role: row.role },
    ]),
  );
}

// Действующая история: срок ещё не вышел. Все запросы модуля идут только через это условие.
const isActive = (now: Date) => gt(stories.expiresAt, now);

async function loadActive(db: Db, storyId: string, now: Date): Promise<StoryRow> {
  const [row] = await db.select().from(stories).where(and(eq(stories.id, storyId), isActive(now)));
  if (!row) throw storyNotFound();
  return row;
}

export async function listStories(db: Db, viewerProfileId: string | null, now: Date): Promise<StoriesResponse> {
  const rows = await db.select().from(stories).where(isActive(now)).orderBy(asc(stories.createdAt), asc(stories.id));
  if (rows.length === 0) return { groups: [] };
  const ids = rows.map((row) => row.id);

  const [authors, photos, seen, counts] = await Promise.all([
    loadAuthors(db, rows.map((row) => row.authorProfileId)),
    db
      .select({ id: mediaFiles.id, width: mediaFiles.width, height: mediaFiles.height })
      .from(mediaFiles)
      .where(inArray(mediaFiles.id, rows.map((row) => row.mediaId))),
    viewerProfileId
      ? db
          .select({ storyId: storyViews.storyId })
          .from(storyViews)
          .where(and(inArray(storyViews.storyId, ids), eq(storyViews.viewerProfileId, viewerProfileId)))
      : Promise.resolve([]),
    db
      .select({ storyId: storyViews.storyId, count: sql<number>`count(*)::int` })
      .from(storyViews)
      .where(inArray(storyViews.storyId, ids))
      .groupBy(storyViews.storyId),
  ]);
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  const seenIds = new Set(seen.map((row) => row.storyId));
  const countById = new Map(counts.map((row) => [row.storyId, row.count]));

  const groups = new Map<string, StoryGroup & { latest: number }>();
  for (const row of rows) {
    const mine = row.authorProfileId === viewerProfileId;
    const photo = photoById.get(row.mediaId)!;
    const story: Story = {
      storyId: row.id,
      photo: { url: mediaPath(row.mediaId), width: photo.width, height: photo.height },
      caption: row.caption,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      // Свою историю считаем просмотренной
      viewedByMe: mine || seenIds.has(row.id),
      viewCount: mine ? (countById.get(row.id) ?? 0) : null,
      canDelete: mine,
    };
    const group = groups.get(row.authorProfileId) ?? {
      author: authors.get(row.authorProfileId)!,
      isMine: mine,
      hasUnseen: false,
      stories: [],
      latest: 0,
    };
    group.stories.push(story);
    group.hasUnseen ||= !story.viewedByMe;
    group.latest = Math.max(group.latest, row.createdAt.getTime());
    groups.set(row.authorProfileId, group);
  }

  const rank = (group: StoryGroup) => (group.isMine ? 0 : group.hasUnseen ? 1 : 2);
  const ordered = [...groups.values()].sort((a, b) => rank(a) - rank(b) || b.latest - a.latest);
  return { groups: ordered.map(({ latest: _latest, ...group }) => group) };
}

export async function createStory(
  db: Db,
  me: ProfileRef,
  accountId: string,
  input: { mediaId: string; caption: string },
  now: Date,
): Promise<void> {
  // Прикрепить можно только своё фото, загруженное для истории и ещё не использованное
  const [owned] = await db
    .select({ id: mediaFiles.id })
    .from(mediaFiles)
    .where(and(eq(mediaFiles.id, input.mediaId), eq(mediaFiles.ownerAccountId, accountId), eq(mediaFiles.purpose, 'story')));
  const [used] = await db.select({ id: stories.id }).from(stories).where(eq(stories.mediaId, input.mediaId));
  if (!owned || used) {
    throw new ApiError(400, 'validation_error', 'Не получилось найти загруженное фото. Выберите его ещё раз');
  }
  await db.insert(stories).values({
    authorProfileId: me.profileId,
    mediaId: input.mediaId,
    caption: input.caption,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TTL_MS),
  });
}

export async function markViewed(db: Db, me: ProfileRef, storyId: string, now: Date): Promise<void> {
  const story = await loadActive(db, storyId, now);
  // Собственные просмотры в список не попадают
  if (story.authorProfileId === me.profileId) return;
  await db.insert(storyViews).values({ storyId, viewerProfileId: me.profileId, viewedAt: now }).onConflictDoNothing();
}

export async function listViewers(db: Db, me: ProfileRef, storyId: string, now: Date): Promise<StoryViewersResponse> {
  const story = await loadActive(db, storyId, now);
  if (story.authorProfileId !== me.profileId) throw new ApiError(403, 'forbidden', 'Кто посмотрел, видит только автор истории');
  const rows = await db
    .select({ viewerProfileId: storyViews.viewerProfileId, viewedAt: storyViews.viewedAt })
    .from(storyViews)
    .where(eq(storyViews.storyId, storyId))
    .orderBy(desc(storyViews.viewedAt));
  const viewers = await loadAuthors(db, rows.map((row) => row.viewerProfileId));
  return { viewers: rows.map((row) => ({ viewer: viewers.get(row.viewerProfileId)!, viewedAt: row.viewedAt.toISOString() })) };
}

export async function deleteStory(deps: MediaDeps, me: ProfileRef, storyId: string, now: Date): Promise<void> {
  const story = await loadActive(deps.db, storyId, now);
  if (story.authorProfileId !== me.profileId) throw new ApiError(403, 'forbidden', 'Удалить можно только свою историю');
  // Запись об истории исчезает вместе с записью о фото
  await deleteMedia(deps, story.mediaId);
}

// Фоновая очистка: просроченные истории удаляются вместе с файлами
export async function purgeExpiredStories(deps: MediaDeps, now: Date): Promise<number> {
  const expired = await deps.db.select({ mediaId: stories.mediaId }).from(stories).where(lte(stories.expiresAt, now));
  for (const story of expired) await deleteMedia(deps, story.mediaId);
  return expired.length;
}
