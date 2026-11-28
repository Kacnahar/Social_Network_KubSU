import { z } from 'zod';
import { gifSchema } from '../core/gifs';
import { roleSchema } from '../core/roles';

export const POST_TEXT_MAX = 5000;
export const POST_PHOTOS_MAX = 10;
export const COMMENT_TEXT_MAX = 1000;
export const REPORT_REASON_MAX = 500;
export const POSTS_PAGE_SIZE = 20;
export const COMMENTS_PAGE_SIZE = 50;

// Автор записи — всегда открытый профиль. Ника комнат здесь не бывает.
export const authorSchema = z.object({
  profileId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: roleSchema,
});
export type Author = z.infer<typeof authorSchema>;

export const postPhotoSchema = z.object({
  url: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});
export type PostPhoto = z.infer<typeof postPhotoSchema>;

export const postSchema = z.object({
  postId: z.string(),
  author: authorSchema,
  text: z.string(),
  photos: z.array(postPhotoSchema),
  // GIF из gifs.ru (не больше одного и только без фото); нет — null
  gif: gifSchema.nullish(),
  likeCount: z.number().int(),
  likedByMe: z.boolean(),
  commentCount: z.number().int(),
  createdAt: z.iso.datetime(),
  // Можно ли мне удалить этот пост (он мой)
  canDelete: z.boolean(),
});
export type Post = z.infer<typeof postSchema>;

export const createPostRequestSchema = z
  .object({
    text: z.string().trim().max(POST_TEXT_MAX).default(''),
    // Идентификаторы фото, загруженных через POST /v1/media?purpose=post, в нужном порядке
    photoMediaIds: z.array(z.uuid()).max(POST_PHOTOS_MAX).default([]),
    // GIF, выбранный в окне GIF (данные из GET /v1/gifs/*)
    gif: gifSchema.optional(),
  })
  .refine((post) => post.text.length > 0 || post.photoMediaIds.length > 0 || post.gif !== undefined, {
    message: 'Пост не может быть пустым',
  })
  .refine((post) => post.gif === undefined || post.photoMediaIds.length === 0, {
    message: 'GIF и фото вместе прикрепить нельзя',
  })
  .refine((post) => new Set(post.photoMediaIds).size === post.photoMediaIds.length, {
    message: 'Одно фото нельзя прикрепить дважды',
  });
export type CreatePostRequest = z.input<typeof createPostRequestSchema>;

export const postsPageSchema = z.object({
  posts: z.array(postSchema),
  // Передать в ?before=, чтобы получить следующую порцию; null — больше ничего нет
  nextCursor: z.string().nullable(),
});
export type PostsPage = z.infer<typeof postsPageSchema>;

export const likeResponseSchema = z.object({
  likeCount: z.number().int(),
  likedByMe: z.boolean(),
});
export type LikeResponse = z.infer<typeof likeResponseSchema>;

export const commentSchema = z.object({
  commentId: z.string(),
  author: authorSchema,
  // Пустой, если комментарий из одного GIF
  text: z.string(),
  gif: gifSchema.nullish(),
  createdAt: z.iso.datetime(),
  // Можно ли мне удалить: это мой комментарий или комментарий под моим постом
  canDelete: z.boolean(),
});
export type Comment = z.infer<typeof commentSchema>;

export const createCommentRequestSchema = z
  .object({
    text: z.string().trim().max(COMMENT_TEXT_MAX).default(''),
    gif: gifSchema.optional(),
  })
  .refine((comment) => comment.text.length > 0 || comment.gif !== undefined, {
    message: 'Комментарий не может быть пустым',
  });
export type CreateCommentRequest = z.input<typeof createCommentRequestSchema>;

export const commentsPageSchema = z.object({
  // От старых к новым
  comments: z.array(commentSchema),
  // Передать в ?after=, чтобы получить следующие; null — больше ничего нет
  nextCursor: z.string().nullable(),
});
export type CommentsPage = z.infer<typeof commentsPageSchema>;

export const reportRequestSchema = z.object({
  reason: z.string().trim().max(REPORT_REASON_MAX).default(''),
});
export type ReportRequest = z.input<typeof reportRequestSchema>;
