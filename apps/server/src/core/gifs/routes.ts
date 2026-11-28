// Запросы GIF: поиск и популярные. Приложение ходит сюда, а в каталог gifs.ru — только наш сервер.
// Доступно тем, кто может комментировать (студент, преподаватель); гостю — нет.

import { API_PREFIX, gifsSearchQuerySchema, gifsTrendingQuerySchema, type GifsPage } from '@app/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Db } from '../../db/client';
import { requireCapability } from '../account';
import { authenticate } from '../auth/service';
import { ApiError } from '../errors';
import { MemoryGifCache, PerAccountLimiter, type GifCache } from './cache';
import type { GifProvider } from './gifsru';

const TRENDING_TTL_MS = 10 * 60_000;
const SEARCH_TTL_MS = 60 * 60_000;

export type GifsDeps = {
  db: Db;
  // null — ключ gifs.ru не задан: запросы отвечают «GIF недоступны»
  gifs: GifProvider | null;
  rateLimitPerMinute: number;
  cache?: GifCache;
};

const unavailable = () => new ApiError(503, 'gifs_unavailable', 'GIF сейчас недоступны. Попробуйте позже');

export function registerGifsRoutes(app: FastifyInstance, { db, gifs, rateLimitPerMinute, cache = new MemoryGifCache() }: GifsDeps): void {
  const limiter = new PerAccountLimiter(rateLimitPerMinute);

  const guard = async (request: FastifyRequest): Promise<GifProvider> => {
    const { accountId } = await authenticate(db, request.headers.authorization);
    await requireCapability(db, accountId, 'react');
    if (!limiter.hit(accountId)) throw new ApiError(429, 'too_many_requests', 'Слишком много запросов. Подождите минуту');
    if (!gifs) throw unavailable();
    return gifs;
  };

  const cached = async (key: string, ttlMs: number, load: () => Promise<GifsPage>): Promise<GifsPage> => {
    const hit = await cache.get(key);
    if (hit) return hit;
    let page: GifsPage;
    try {
      page = await load();
    } catch (error) {
      // В журнал — только короткая причина, без подробностей запроса
      app.log.warn(`GIF: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
      throw unavailable();
    }
    await cache.set(key, page, ttlMs);
    return page;
  };

  app.get(`${API_PREFIX}/gifs/trending`, async (request): Promise<GifsPage> => {
    const provider = await guard(request);
    const { pos } = gifsTrendingQuerySchema.parse(request.query);
    return cached(`trending:${pos ?? ''}`, TRENDING_TTL_MS, () => provider.trending(pos));
  });

  app.get(`${API_PREFIX}/gifs/search`, async (request): Promise<GifsPage> => {
    const provider = await guard(request);
    const { q, pos } = gifsSearchQuerySchema.parse(request.query);
    const text = q.toLowerCase();
    return cached(`search:${pos ?? ''}:${text}`, SEARCH_TTL_MS, () => provider.search(text, pos));
  });
}
