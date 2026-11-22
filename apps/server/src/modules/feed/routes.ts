// Запросы МОДУЛЯ «Лента». Своих таблиц у ленты нет: она собирает экран из постов (позже — и историй).
// Это единственный модуль, которому разрешено обращаться к другому модулю — к постам.

import { API_PREFIX, type PostsPage } from '@app/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/service';
import { findProfileId } from '../../core/profile/service';
import type { Db } from '../../db/client';
import { listAllPosts } from '../posts/service';

const cursorQuery = z.string().max(100).optional();

export function registerFeedRoutes(app: FastifyInstance, { db }: { db: Db }): void {
  // Смотреть ленту может любой вошедший, в том числе гость
  app.get<{ Querystring: { before?: string } }>(`${API_PREFIX}/feed`, async (request): Promise<PostsPage> => {
    const { accountId } = await authenticate(db, request.headers.authorization);
    return listAllPosts(db, cursorQuery.parse(request.query.before), await findProfileId(db, accountId));
  });
}
