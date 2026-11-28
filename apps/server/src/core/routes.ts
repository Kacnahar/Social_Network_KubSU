// Запросы ЯДРА соцсети: состояние сервера, вход, аккаунт, подписка на уведомления.

import {
  API_PREFIX,
  MEDIA_MAX_BYTES,
  MEDIA_TYPES,
  authStartRequestSchema,
  authVerifyRequestSchema,
  mediaPurposeSchema,
  updateProfileRequestSchema,
  usernameSchema,
  pushSubscribeRequestSchema,
  pushUnsubscribeRequestSchema,
  type AccountResponse,
  type AuthStartResponse,
  type AuthVerifyResponse,
  type HealthResponse,
  type MyProfileResponse,
  type OkResponse,
  type Profile,
  type PushConfigResponse,
  type UploadMediaResponse,
  type UsernameAvailableResponse,
} from '@app/shared';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config';
import type { Db } from '../db/client';
import { z } from 'zod';
import { deleteAccount, getAccountStanding, isBanned } from './account';
import { authenticate, endSession, isEmaillessGuest, startGuestSession, startLogin, verifyLogin, type AuthDeps } from './auth/service';
import { ApiError, unauthorized } from './errors';
import type { Mailer } from './mailer';
import { readMedia, uploadMedia } from './media/service';
import type { MediaStorage } from './media/storage';
import { getOwnProfile, getProfileById, isUsernameAvailable, saveOwnProfile } from './profile/service';
import { removeSubscription, saveSubscription, type PushGateway } from './push/service';

const SERVICE_NAME = 'app-server';
const SERVICE_VERSION = '0.9.0';
const idParam = z.uuid();

export type CoreDeps = {
  config: Config;
  db: Db;
  mailer: Mailer;
  // null — напоминания выключены
  push: PushGateway | null;
  media: MediaStorage;
};

export function registerCoreRoutes(app: FastifyInstance, { config, db, mailer, push, media }: CoreDeps): void {
  const mediaDeps = { db, media };
  const authDeps: AuthDeps = { db, config, mailer, onMailError: (error) => app.log.error(error) };
  const authLimit = { config: { rateLimit: { max: config.authRateLimitPerMinute, timeWindow: '1 minute' } } };

  app.get(`${API_PREFIX}/health`, async (): Promise<HealthResponse> => ({
    status: 'ok',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    time: new Date().toISOString(),
  }));

  // ---------- Вход ----------

  app.post(`${API_PREFIX}/auth/start`, authLimit, async (request): Promise<AuthStartResponse> => {
    const result = await startLogin(authDeps, authStartRequestSchema.parse(request.body));
    return { ok: true, ...result };
  });

  app.post(`${API_PREFIX}/auth/verify`, authLimit, async (request): Promise<AuthVerifyResponse> =>
    verifyLogin(authDeps, authVerifyRequestSchema.parse(request.body)),
  );

  // Вход гостем без регистрации: только просмотр. Почты у такого аккаунта нет
  app.post(`${API_PREFIX}/auth/guest`, authLimit, async (): Promise<AuthVerifyResponse> => startGuestSession(db));

  app.post(`${API_PREFIX}/auth/logout`, async (request): Promise<OkResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    await endSession(db, session.sessionId);
    // Гостю без почты вернуться в аккаунт нечем — удаляем его вместе с сессией
    if (await isEmaillessGuest(db, session.accountId)) await deleteAccount(mediaDeps, session.accountId);
    return { ok: true };
  });

  // ---------- Аккаунт: без ника комнат и без идентификаторов ----------

  app.get(`${API_PREFIX}/account`, async (request): Promise<AccountResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    const account = await getAccountStanding(db, session.accountId);
    if (!account) throw unauthorized();
    // Истёкший бан наружу не показываем: для приложения человек снова «активен»
    const banned = isBanned(account, new Date());
    return {
      role: account.role,
      status: banned ? 'banned' : 'active',
      bannedUntil: banned ? (account.bannedUntil?.toISOString() ?? null) : null,
      isAdmin: account.emailHash !== null && config.adminEmailHashes.includes(account.emailHash),
    };
  });

  app.delete(`${API_PREFIX}/account`, async (request): Promise<OkResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    await deleteAccount(mediaDeps, session.accountId);
    return { ok: true };
  });

  // ---------- Профиль соцсети: открытые данные, без ника комнат ----------

  app.get(`${API_PREFIX}/profile`, async (request): Promise<MyProfileResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    return getOwnProfile(db, session.accountId);
  });

  app.put(`${API_PREFIX}/profile`, async (request): Promise<MyProfileResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    return saveOwnProfile(mediaDeps, session.accountId, updateProfileRequestSchema.parse(request.body));
  });

  // Свободен ли публичный никнейм: для подсказки в форме, пока человек печатает
  app.get<{ Querystring: { username?: string } }>(
    `${API_PREFIX}/profile/username-available`,
    async (request): Promise<UsernameAvailableResponse> => {
      const session = await authenticate(db, request.headers.authorization);
      const username = usernameSchema.parse(request.query.username);
      return { available: await isUsernameAvailable(db, session.accountId, username) };
    },
  );

  app.get<{ Params: { profileId: string } }>(`${API_PREFIX}/profiles/:profileId`, async (request): Promise<Profile> => {
    const session = await authenticate(db, request.headers.authorization);
    return getProfileById(db, idParam.parse(request.params.profileId), session.accountId);
  });

  // ---------- Фото ----------

  // Тело запроса — сами байты картинки
  app.addContentTypeParser([...MEDIA_TYPES], { parseAs: 'buffer', bodyLimit: MEDIA_MAX_BYTES }, (_request, body, done) => {
    done(null, body);
  });

  app.post<{ Querystring: { purpose?: string } }>(
    `${API_PREFIX}/media`,
    { bodyLimit: MEDIA_MAX_BYTES },
    async (request): Promise<UploadMediaResponse> => {
      const session = await authenticate(db, request.headers.authorization);
      const purpose = mediaPurposeSchema.parse(request.query.purpose);
      return uploadMedia(mediaDeps, session.accountId, purpose, request.body);
    },
  );

  // Фото отдаются без входа: адрес содержит длинный случайный идентификатор, который нельзя угадать.
  // Иначе обычная картинка на странице не смогла бы загрузиться.
  app.get<{ Params: { mediaId: string } }>(`${API_PREFIX}/media/:mediaId`, async (request, reply) => {
    const parsed = idParam.safeParse(request.params.mediaId);
    const file = parsed.success ? await readMedia(mediaDeps, parsed.data) : null;
    if (!file) throw new ApiError(404, 'not_found', 'Такого фото нет');
    return reply
      .header('content-type', file.mime)
      .header('cache-control', 'private, max-age=31536000, immutable')
      .header('x-content-type-options', 'nosniff')
      .header('cross-origin-resource-policy', 'cross-origin')
      .send(file.data);
  });

  // ---------- Уведомления ----------

  app.get(`${API_PREFIX}/push/config`, async (): Promise<PushConfigResponse> => ({
    vapidPublicKey: push?.publicKey ?? null,
  }));

  app.post(`${API_PREFIX}/push/subscriptions`, async (request): Promise<OkResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    if (!push) throw new ApiError(503, 'push_unavailable', 'Напоминания временно недоступны');
    await saveSubscription(db, session.accountId, pushSubscribeRequestSchema.parse(request.body));
    return { ok: true };
  });

  app.delete(`${API_PREFIX}/push/subscriptions`, async (request): Promise<OkResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    const { endpoint } = pushUnsubscribeRequestSchema.parse(request.body);
    await removeSubscription(db, session.accountId, endpoint);
    return { ok: true };
  });
}
