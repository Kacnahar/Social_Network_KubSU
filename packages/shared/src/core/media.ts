import { z } from 'zod';

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// Для чего фото: от этого зависит, кому можно загружать и как оно обрабатывается
export const MEDIA_PURPOSES = ['avatar', 'post', 'story'] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];
export const mediaPurposeSchema = z.enum(MEDIA_PURPOSES);

export const uploadMediaResponseSchema = z.object({
  mediaId: z.string(),
  url: z.string(),
});
export type UploadMediaResponse = z.infer<typeof uploadMediaResponseSchema>;

export const mediaPath = (mediaId: string) => `/v1/media/${mediaId}`;
