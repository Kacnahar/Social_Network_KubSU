import { randomUUID } from 'node:crypto';
import { MEDIA_MAX_BYTES, can, mediaPath, type MediaPurpose, type UploadMediaResponse } from '@app/shared';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import type { Db, DbOrTx } from '../../db/client';
import { mediaFiles } from '../../db/schema';
import { forbidden, getAccountStanding } from '../account';
import { ApiError, unauthorized } from '../errors';
import type { MediaStorage } from './storage';

const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
const AVATAR_SIDE = 512;
const PHOTO_MAX_SIDE = 2048;
const OUTPUT_MIME = 'image/jpeg';

export type MediaDeps = { db: Db; media: MediaStorage };

const invalid = () => new ApiError(400, 'media_invalid', 'Это не похоже на фото. Подходят JPEG, PNG и WebP');

// Пересохраняет фото: проверяет, что это действительно картинка, уменьшает и НЕ переносит
// служебные данные исходника (в том числе место съёмки)
async function processImage(input: Buffer, purpose: MediaPurpose) {
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    throw invalid();
  }
  // Тип проверяем по содержимому, а не по заголовку запроса: иначе под видом фото пройдёт SVG со скриптом
  if (!format || !ALLOWED_FORMATS.includes(format)) throw invalid();

  const pipeline = sharp(input).rotate();
  const resized =
    purpose === 'avatar'
      ? pipeline.resize(AVATAR_SIDE, AVATAR_SIDE, { fit: 'cover' })
      : pipeline.resize(PHOTO_MAX_SIDE, PHOTO_MAX_SIDE, { fit: 'inside', withoutEnlargement: true });
  try {
    const { data, info } = await resized
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw invalid();
  }
}

export async function uploadMedia(
  deps: MediaDeps,
  accountId: string,
  purpose: MediaPurpose,
  body: unknown,
): Promise<UploadMediaResponse> {
  const account = await getAccountStanding(deps.db, accountId);
  if (!account) throw unauthorized();
  // Аватар нужен всем; фото для постов и историй — только тем, кто может публиковать
  if (purpose !== 'avatar' && !can(account.role, 'publish')) throw forbidden();

  if (!Buffer.isBuffer(body) || body.length === 0) throw invalid();
  if (body.length > MEDIA_MAX_BYTES) throw new ApiError(413, 'media_too_large', 'Фото больше 10 МБ');

  const image = await processImage(body, purpose);
  const id = randomUUID();
  const storageKey = `${id}.jpg`;
  await deps.media.put(storageKey, image.data);
  await deps.db.insert(mediaFiles).values({
    id,
    ownerAccountId: accountId,
    purpose,
    storageKey,
    mime: OUTPUT_MIME,
    width: image.width,
    height: image.height,
    bytes: image.data.length,
    createdAt: new Date(),
  });
  return { mediaId: id, url: mediaPath(id) };
}

export async function readMedia(deps: MediaDeps, mediaId: string): Promise<{ data: Buffer; mime: string } | null> {
  const [file] = await deps.db
    .select({ storageKey: mediaFiles.storageKey, mime: mediaFiles.mime })
    .from(mediaFiles)
    .where(eq(mediaFiles.id, mediaId));
  if (!file) return null;
  const data = await deps.media.get(file.storageKey);
  return data ? { data, mime: file.mime } : null;
}

export async function findOwnMedia(db: DbOrTx, accountId: string, mediaId: string, purpose: MediaPurpose) {
  const [file] = await db
    .select({ id: mediaFiles.id })
    .from(mediaFiles)
    .where(and(eq(mediaFiles.id, mediaId), eq(mediaFiles.ownerAccountId, accountId), eq(mediaFiles.purpose, purpose)));
  return file ?? null;
}

export async function deleteMedia(deps: MediaDeps, mediaId: string): Promise<void> {
  const [file] = await deps.db.delete(mediaFiles).where(eq(mediaFiles.id, mediaId)).returning({ storageKey: mediaFiles.storageKey });
  if (file) await deps.media.delete(file.storageKey);
}
