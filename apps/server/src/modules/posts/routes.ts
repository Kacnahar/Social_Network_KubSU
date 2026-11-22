// Запросы МОДУЛЯ «Посты»: посты, лайки, комментарии, жалобы.
// Работают только с открытым профилем; ника комнат и personaId здесь не бывает.

import {
  API_PREFIX,
  createCommentRequestSchema,
  createPostRequestSchema,
  reportRequestSchema,
  type Comment,
  type CommentsPage,
  type LikeResponse,
  type OkResponse,
  type Post,
  type PostsPage,
} from '@app/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/service';
import type { MediaStorage } from '../../core/media/storage';
import { findProfileId, requireProfile } from '../../core/profile/service';
import type { Db } from '../../db/client';
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getPost,
  listComments,
  listProfilePosts,
  report,
  setLike,
} from './service';

const idParam = z.uuid();
const cursorQuery = z.string().max(100).optional();

export type PostsDeps = { db: Db; media: MediaStorage };

export function registerPostsRoutes(app: FastifyInstance, { db, media }: PostsDeps): void {
  const POSTS = `${API_PREFIX}/posts`;
  const accountOf = async (request: FastifyRequest) => (await authenticate(db, request.headers.authorization)).accountId;
  // Смотреть может любой вошедший, в том числе гость
  const viewerOf = async (request: FastifyRequest) => findProfileId(db, await accountOf(request));

  // ---------- Посты ----------

  app.post(POSTS, async (request): Promise<Post> => {
    const accountId = await accountOf(request);
    const me = await requireProfile(db, accountId, 'publish');
    const input = createPostRequestSchema.parse(request.body);
    return createPost(db, me, accountId, input);
  });

  app.get<{ Params: { postId: string } }>(`${POSTS}/:postId`, async (request): Promise<Post> => {
    const viewer = await viewerOf(request);
    return getPost(db, idParam.parse(request.params.postId), viewer);
  });

  app.delete<{ Params: { postId: string } }>(`${POSTS}/:postId`, async (request): Promise<OkResponse> => {
    const me = await requireProfile(db, await accountOf(request), 'publish');
    await deletePost({ db, media }, me, idParam.parse(request.params.postId));
    return { ok: true };
  });

  app.get<{ Params: { profileId: string }; Querystring: { before?: string } }>(
    `${API_PREFIX}/profiles/:profileId/posts`,
    async (request): Promise<PostsPage> => {
      const viewer = await viewerOf(request);
      return listProfilePosts(db, idParam.parse(request.params.profileId), cursorQuery.parse(request.query.before), viewer);
    },
  );

  // ---------- Лайки ----------

  for (const [method, liked] of [
    ['PUT', true],
    ['DELETE', false],
  ] as const) {
    app.route<{ Params: { postId: string } }>({
      method,
      url: `${POSTS}/:postId/like`,
      handler: async (request): Promise<LikeResponse> => {
        const me = await requireProfile(db, await accountOf(request), 'react');
        return setLike(db, me, idParam.parse(request.params.postId), liked);
      },
    });
  }

  // ---------- Комментарии ----------

  app.get<{ Params: { postId: string }; Querystring: { after?: string } }>(
    `${POSTS}/:postId/comments`,
    async (request): Promise<CommentsPage> => {
      const viewer = await viewerOf(request);
      return listComments(db, idParam.parse(request.params.postId), cursorQuery.parse(request.query.after), viewer);
    },
  );

  app.post<{ Params: { postId: string } }>(`${POSTS}/:postId/comments`, async (request): Promise<Comment> => {
    const me = await requireProfile(db, await accountOf(request), 'react');
    const { text } = createCommentRequestSchema.parse(request.body);
    return addComment(db, me, idParam.parse(request.params.postId), text);
  });

  app.delete<{ Params: { commentId: string } }>(`${POSTS}/comments/:commentId`, async (request): Promise<OkResponse> => {
    const me = await requireProfile(db, await accountOf(request), 'react');
    await deleteComment(db, me, idParam.parse(request.params.commentId));
    return { ok: true };
  });

  // ---------- Жалобы: может любой вошедший, включая гостя ----------

  app.post<{ Params: { postId: string } }>(`${POSTS}/:postId/report`, async (request): Promise<OkResponse> => {
    const reporter = await viewerOf(request);
    const { reason } = reportRequestSchema.parse(request.body ?? {});
    await report(db, reporter, { type: 'post', id: idParam.parse(request.params.postId) }, reason);
    return { ok: true };
  });

  app.post<{ Params: { commentId: string } }>(`${POSTS}/comments/:commentId/report`, async (request): Promise<OkResponse> => {
    const reporter = await viewerOf(request);
    const { reason } = reportRequestSchema.parse(request.body ?? {});
    await report(db, reporter, { type: 'comment', id: idParam.parse(request.params.commentId) }, reason);
    return { ok: true };
  });
}
