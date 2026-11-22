// Запросы МОДУЛЯ «Истории»: фото с подписью, которое живёт 24 часа.
// Работают только с открытым профилем; ника комнат и personaId здесь не бывает.

import {
  API_PREFIX,
  createStoryRequestSchema,
  type OkResponse,
  type StoriesResponse,
  type StoryViewersResponse,
} from '@app/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/service';
import type { MediaStorage } from '../../core/media/storage';
import { findProfileId, requireProfile } from '../../core/profile/service';
import type { Db } from '../../db/client';
import { createStory, deleteStory, listStories, listViewers, markViewed } from './service';

const idParam = z.uuid();

export function registerStoriesRoutes(app: FastifyInstance, { db, media }: { db: Db; media: MediaStorage }): void {
  const STORIES = `${API_PREFIX}/stories`;
  const accountOf = async (request: FastifyRequest) => (await authenticate(db, request.headers.authorization)).accountId;

  // Смотреть может любой вошедший, в том числе гость
  app.get(STORIES, async (request): Promise<StoriesResponse> =>
    listStories(db, await findProfileId(db, await accountOf(request)), new Date()),
  );

  app.post(STORIES, async (request): Promise<OkResponse> => {
    const accountId = await accountOf(request);
    const me = await requireProfile(db, accountId, 'publish');
    const input = createStoryRequestSchema.parse(request.body);
    await createStory(db, me, accountId, input, new Date());
    return { ok: true };
  });

  // Отметка «посмотрел» — не публикация: доступна всем, у кого есть профиль
  app.post<{ Params: { storyId: string } }>(`${STORIES}/:storyId/view`, async (request): Promise<OkResponse> => {
    const me = await requireProfile(db, await accountOf(request));
    await markViewed(db, me, idParam.parse(request.params.storyId), new Date());
    return { ok: true };
  });

  app.get<{ Params: { storyId: string } }>(`${STORIES}/:storyId/viewers`, async (request): Promise<StoryViewersResponse> => {
    const me = await requireProfile(db, await accountOf(request));
    return listViewers(db, me, idParam.parse(request.params.storyId), new Date());
  });

  app.delete<{ Params: { storyId: string } }>(`${STORIES}/:storyId`, async (request): Promise<OkResponse> => {
    const me = await requireProfile(db, await accountOf(request), 'publish');
    await deleteStory({ db, media }, me, idParam.parse(request.params.storyId), new Date());
    return { ok: true };
  });
}
