// Фоновая уборка всего сервера: просроченные истории и загруженные, но нигде не использованные фото.
// Живёт вне модулей, потому что должна знать обо всех местах, где фото может использоваться.

import { and, eq, isNull, lte } from 'drizzle-orm';
import { deleteMedia, type MediaDeps } from './core/media/service';
import { mediaFiles, postPhotos, profiles, stories } from './db/schema';
import { purgeExpiredStories } from './modules/stories/service';

const UNUSED_MEDIA_AGE_MS = 24 * 60 * 60 * 1000;
const INTERVAL_MS = 10 * 60 * 1000;

// Человек выбрал фото, но не сохранил профиль, пост или историю — через сутки файл удаляется
export async function purgeUnusedMedia(deps: MediaDeps, now: Date): Promise<number> {
  const unused = await deps.db
    .select({ id: mediaFiles.id })
    .from(mediaFiles)
    .leftJoin(profiles, eq(profiles.avatarMediaId, mediaFiles.id))
    .leftJoin(postPhotos, eq(postPhotos.mediaId, mediaFiles.id))
    .leftJoin(stories, eq(stories.mediaId, mediaFiles.id))
    .where(
      and(
        lte(mediaFiles.createdAt, new Date(now.getTime() - UNUSED_MEDIA_AGE_MS)),
        isNull(profiles.id),
        isNull(postPhotos.postId),
        isNull(stories.id),
      ),
    );
  for (const file of unused) await deleteMedia(deps, file.id);
  return unused.length;
}

export async function runMaintenance(deps: MediaDeps, now: Date): Promise<void> {
  await purgeExpiredStories(deps, now);
  await purgeUnusedMedia(deps, now);
}

export function startMaintenance(deps: MediaDeps, onError: (error: unknown) => void): () => void {
  const tick = () => runMaintenance(deps, new Date()).catch(onError);
  void tick();
  const timer = setInterval(tick, INTERVAL_MS);
  return () => clearInterval(timer);
}
