import {
  COMMENTS_PAGE_SIZE,
  POSTS_PAGE_SIZE,
  mediaPath,
  type Author,
  type Comment,
  type CommentsPage,
  type LikeResponse,
  type Post,
  type PostsPage,
} from '@app/shared';
import { and, asc, desc, eq, gt, inArray, lt, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { ApiError } from '../../core/errors';
import { deleteMedia, type MediaDeps } from '../../core/media/service';
import type { ProfileRef } from '../../core/profile/service';
import type { Db } from '../../db/client';
import { accounts, mediaFiles, postComments, postLikes, postPhotos, postReports, posts, profiles } from '../../db/schema';

type PostRow = typeof posts.$inferSelect;
type CommentRow = typeof postComments.$inferSelect;

const notFound = (what: string) => new ApiError(404, 'not_found', what);
const postNotFound = () => notFound('Такого поста нет');

// ---------- Курсор «откуда продолжать»: время и идентификатор последней показанной записи ----------

const cursorSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z_[0-9a-f-]{36}$/);

const encodeCursor = (row: { createdAt: Date; id: string }) => `${row.createdAt.toISOString()}_${row.id}`;

function decodeCursor(raw: string | undefined): { createdAt: Date; id: string } | null {
  if (raw === undefined) return null;
  const parsed = cursorSchema.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, 'validation_error', 'Некорректный запрос');
  const [iso, id] = parsed.data.split('_') as [string, string];
  return { createdAt: new Date(iso), id };
}

// ---------- Сборка ответа ----------

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
      {
        profileId: row.id,
        displayName: row.displayName,
        avatarUrl: row.avatarMediaId ? mediaPath(row.avatarMediaId) : null,
        role: row.role,
      },
    ]),
  );
}

async function toPosts(db: Db, rows: PostRow[], viewerProfileId: string | null): Promise<Post[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const count = sql<number>`count(*)::int`;

  const [authors, photos, likes, comments, mine] = await Promise.all([
    loadAuthors(db, rows.map((row) => row.authorProfileId)),
    db
      .select({ postId: postPhotos.postId, mediaId: postPhotos.mediaId, width: mediaFiles.width, height: mediaFiles.height })
      .from(postPhotos)
      .innerJoin(mediaFiles, eq(mediaFiles.id, postPhotos.mediaId))
      .where(inArray(postPhotos.postId, ids))
      .orderBy(asc(postPhotos.position)),
    db.select({ postId: postLikes.postId, count }).from(postLikes).where(inArray(postLikes.postId, ids)).groupBy(postLikes.postId),
    db
      .select({ postId: postComments.postId, count })
      .from(postComments)
      .where(inArray(postComments.postId, ids))
      .groupBy(postComments.postId),
    viewerProfileId
      ? db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(and(inArray(postLikes.postId, ids), eq(postLikes.profileId, viewerProfileId)))
      : Promise.resolve([]),
  ]);

  const likeCounts = new Map(likes.map((row) => [row.postId, row.count]));
  const commentCounts = new Map(comments.map((row) => [row.postId, row.count]));
  const likedByMe = new Set(mine.map((row) => row.postId));

  return rows.map((row) => ({
    postId: row.id,
    author: authors.get(row.authorProfileId)!,
    text: row.text,
    photos: photos
      .filter((photo) => photo.postId === row.id)
      .map((photo) => ({ url: mediaPath(photo.mediaId), width: photo.width, height: photo.height })),
    likeCount: likeCounts.get(row.id) ?? 0,
    likedByMe: likedByMe.has(row.id),
    commentCount: commentCounts.get(row.id) ?? 0,
    createdAt: row.createdAt.toISOString(),
    canDelete: row.authorProfileId === viewerProfileId,
  }));
}

async function loadPostRow(db: Db, postId: string): Promise<PostRow> {
  const [row] = await db.select().from(posts).where(eq(posts.id, postId));
  if (!row) throw postNotFound();
  return row;
}

// ---------- Посты ----------

export async function createPost(
  db: Db,
  me: ProfileRef,
  accountId: string,
  input: { text: string; photoMediaIds: string[] },
): Promise<Post> {
  if (input.photoMediaIds.length > 0) {
    // Прикрепить можно только свои фото, загруженные для поста и ещё нигде не использованные
    const owned = await db
      .select({ id: mediaFiles.id })
      .from(mediaFiles)
      .where(
        and(inArray(mediaFiles.id, input.photoMediaIds), eq(mediaFiles.ownerAccountId, accountId), eq(mediaFiles.purpose, 'post')),
      );
    const used = await db.select({ mediaId: postPhotos.mediaId }).from(postPhotos).where(inArray(postPhotos.mediaId, input.photoMediaIds));
    if (owned.length !== input.photoMediaIds.length || used.length > 0) {
      throw new ApiError(400, 'validation_error', 'Не получилось найти загруженные фото. Выберите их ещё раз');
    }
  }

  const row = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(posts)
      .values({ authorProfileId: me.profileId, text: input.text, createdAt: new Date() })
      .returning();
    if (input.photoMediaIds.length > 0) {
      await tx
        .insert(postPhotos)
        .values(input.photoMediaIds.map((mediaId, index) => ({ postId: created!.id, mediaId, position: index + 1 })));
    }
    return created!;
  });
  return (await toPosts(db, [row], me.profileId))[0]!;
}

export async function getPost(db: Db, postId: string, viewerProfileId: string | null): Promise<Post> {
  return (await toPosts(db, [await loadPostRow(db, postId)], viewerProfileId))[0]!;
}

export async function deletePost(deps: MediaDeps, me: ProfileRef, postId: string): Promise<void> {
  const row = await loadPostRow(deps.db, postId);
  if (row.authorProfileId !== me.profileId) throw new ApiError(403, 'forbidden', 'Удалить можно только свой пост');
  const photos = await deps.db.select({ mediaId: postPhotos.mediaId }).from(postPhotos).where(eq(postPhotos.postId, postId));
  await deps.db.delete(posts).where(eq(posts.id, postId));
  // Вместе с постом удаляются и сами файлы фото
  for (const photo of photos) await deleteMedia(deps, photo.mediaId);
}

function olderThan(cursor: { createdAt: Date; id: string } | null): SQL | undefined {
  if (!cursor) return undefined;
  return or(lt(posts.createdAt, cursor.createdAt), and(eq(posts.createdAt, cursor.createdAt), lt(posts.id, cursor.id)));
}

async function pageOfPosts(db: Db, where: SQL | undefined, viewerProfileId: string | null): Promise<PostsPage> {
  const rows = await db
    .select()
    .from(posts)
    .where(where)
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(POSTS_PAGE_SIZE + 1);
  const page = rows.slice(0, POSTS_PAGE_SIZE);
  return {
    posts: await toPosts(db, page, viewerProfileId),
    nextCursor: rows.length > POSTS_PAGE_SIZE ? encodeCursor(page.at(-1)!) : null,
  };
}

// Общая лента: посты всех пользователей, новые сверху. Друзья и подписки появятся позже.
export async function listAllPosts(db: Db, before: string | undefined, viewerProfileId: string | null): Promise<PostsPage> {
  return pageOfPosts(db, olderThan(decodeCursor(before)), viewerProfileId);
}

export async function listProfilePosts(
  db: Db,
  profileId: string,
  before: string | undefined,
  viewerProfileId: string | null,
): Promise<PostsPage> {
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, profileId));
  if (!profile) throw notFound('Такого профиля нет');
  return pageOfPosts(db, and(eq(posts.authorProfileId, profileId), olderThan(decodeCursor(before))), viewerProfileId);
}

// ---------- Лайки ----------

async function likeState(db: Db, postId: string, profileId: string): Promise<LikeResponse> {
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(postLikes).where(eq(postLikes.postId, postId));
  const [mine] = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.profileId, profileId)));
  return { likeCount: total?.count ?? 0, likedByMe: Boolean(mine) };
}

export async function setLike(db: Db, me: ProfileRef, postId: string, liked: boolean): Promise<LikeResponse> {
  await loadPostRow(db, postId);
  if (liked) {
    await db.insert(postLikes).values({ postId, profileId: me.profileId, createdAt: new Date() }).onConflictDoNothing();
  } else {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.profileId, me.profileId)));
  }
  return likeState(db, postId, me.profileId);
}

// ---------- Комментарии ----------

async function toComments(db: Db, rows: CommentRow[], postAuthorId: string, viewerProfileId: string | null): Promise<Comment[]> {
  const authors = await loadAuthors(db, rows.map((row) => row.authorProfileId));
  return rows.map((row) => ({
    commentId: row.id,
    author: authors.get(row.authorProfileId)!,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    canDelete: viewerProfileId !== null && (row.authorProfileId === viewerProfileId || postAuthorId === viewerProfileId),
  }));
}

export async function listComments(
  db: Db,
  postId: string,
  after: string | undefined,
  viewerProfileId: string | null,
): Promise<CommentsPage> {
  const post = await loadPostRow(db, postId);
  const cursor = decodeCursor(after);
  const newer = cursor
    ? or(
        gt(postComments.createdAt, cursor.createdAt),
        and(eq(postComments.createdAt, cursor.createdAt), gt(postComments.id, cursor.id)),
      )
    : undefined;
  const rows = await db
    .select()
    .from(postComments)
    .where(and(eq(postComments.postId, postId), newer))
    .orderBy(asc(postComments.createdAt), asc(postComments.id))
    .limit(COMMENTS_PAGE_SIZE + 1);
  const page = rows.slice(0, COMMENTS_PAGE_SIZE);
  return {
    comments: await toComments(db, page, post.authorProfileId, viewerProfileId),
    nextCursor: rows.length > COMMENTS_PAGE_SIZE ? encodeCursor(page.at(-1)!) : null,
  };
}

export async function addComment(db: Db, me: ProfileRef, postId: string, text: string): Promise<Comment> {
  const post = await loadPostRow(db, postId);
  const [row] = await db
    .insert(postComments)
    .values({ postId, authorProfileId: me.profileId, text, createdAt: new Date() })
    .returning();
  return (await toComments(db, [row!], post.authorProfileId, me.profileId))[0]!;
}

export async function deleteComment(db: Db, me: ProfileRef, commentId: string): Promise<void> {
  const [found] = await db
    .select({ authorProfileId: postComments.authorProfileId, postAuthorId: posts.authorProfileId })
    .from(postComments)
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(eq(postComments.id, commentId));
  if (!found) throw notFound('Такого комментария нет');
  // Удалить может автор комментария и автор поста, под которым он оставлен
  if (found.authorProfileId !== me.profileId && found.postAuthorId !== me.profileId) {
    throw new ApiError(403, 'forbidden', 'Этот комментарий удалить нельзя');
  }
  await db.delete(postComments).where(eq(postComments.id, commentId));
}

// ---------- Жалобы ----------

export async function report(
  db: Db,
  reporterProfileId: string | null,
  target: { type: 'post' | 'comment'; id: string },
  reason: string,
): Promise<void> {
  const table = target.type === 'post' ? posts : postComments;
  const [exists] = await db.select({ id: table.id, authorProfileId: table.authorProfileId }).from(table).where(eq(table.id, target.id));
  if (!exists) throw notFound(target.type === 'post' ? 'Такого поста нет' : 'Такого комментария нет');
  // Повторная жалоба того же человека на ту же запись ничего не добавляет
  if (reporterProfileId) {
    const [already] = await db
      .select({ id: postReports.id })
      .from(postReports)
      .where(
        and(
          eq(postReports.reporterProfileId, reporterProfileId),
          eq(postReports.targetType, target.type),
          eq(postReports.targetId, target.id),
        ),
      );
    if (already) return;
  }
  await db.insert(postReports).values({
    reporterProfileId,
    targetType: target.type,
    targetId: target.id,
    targetAuthorProfileId: exists.authorProfileId,
    reason,
    createdAt: new Date(),
  });
}
