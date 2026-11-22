import { z } from 'zod';
import { authorSchema, postPhotoSchema } from '../posts/posts';

export const STORY_CAPTION_MAX = 200;
export const STORY_TTL_HOURS = 24;

export const storySchema = z.object({
  storyId: z.string(),
  photo: postPhotoSchema,
  caption: z.string(),
  createdAt: z.iso.datetime(),
  // Когда история пропадёт
  expiresAt: z.iso.datetime(),
  viewedByMe: z.boolean(),
  // Сколько человек посмотрело; известно только автору, остальным — null
  viewCount: z.number().int().nullable(),
  canDelete: z.boolean(),
});
export type Story = z.infer<typeof storySchema>;

// Истории одного автора — один кружок вверху ленты
export const storyGroupSchema = z.object({
  author: authorSchema,
  isMine: z.boolean(),
  // Есть ли среди них ещё не просмотренные мной
  hasUnseen: z.boolean(),
  // От старых к новым
  stories: z.array(storySchema),
});
export type StoryGroup = z.infer<typeof storyGroupSchema>;

export const storiesResponseSchema = z.object({
  // Сначала свои, затем с непросмотренными, затем просмотренные
  groups: z.array(storyGroupSchema),
});
export type StoriesResponse = z.infer<typeof storiesResponseSchema>;

export const createStoryRequestSchema = z.object({
  // Фото, загруженное через POST /v1/media?purpose=story
  mediaId: z.uuid(),
  caption: z.string().trim().max(STORY_CAPTION_MAX).default(''),
});
export type CreateStoryRequest = z.input<typeof createStoryRequestSchema>;

export const storyViewersResponseSchema = z.object({
  viewers: z.array(z.object({ viewer: authorSchema, viewedAt: z.iso.datetime() })),
});
export type StoryViewersResponse = z.infer<typeof storyViewersResponseSchema>;
