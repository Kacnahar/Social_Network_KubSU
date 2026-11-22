import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import {
  API_PREFIX,
  authStartRequestSchema,
  authVerifyRequestSchema,
  pushSubscribeRequestSchema,
  pushUnsubscribeRequestSchema,
  setNicknameRequestSchema,
  type AccountResponse,
  type AuthStartResponse,
  type AuthVerifyResponse,
  type ErrorCode,
  type ErrorResponse,
  type HealthResponse,
  type JoinRoomResponse,
  type MeResponse,
  type OkResponse,
  type PushConfigResponse,
  type SlotsResponse,
} from '@rooms/shared';
import { eq } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError, z } from 'zod';
import { authenticate, endSession, startLogin, verifyLogin, type AuthDeps } from './auth/service';
import type { Config } from './config';
import type { Db } from './db/client';
import { accounts } from './db/schema';
import { ApiError, unauthorized } from './errors';
import { deleteAccountAndPersona, getPersonaIdForAccount } from './identity';
import type { Mailer } from './mailer';
import { getMe, setNickname } from './me/service';
import { removeSubscription, saveSubscription, type PushGateway } from './push/service';
import { joinSlot, leaveRoom } from './rooms/service';
import { listUpcomingSlots } from './schedule/service';
import type { VoiceGateway } from './voice/gateway';

const SERVICE_NAME = 'rooms-server';
const SERVICE_VERSION = '0.3.0';

export type AppDeps = {
  config: Config;
  db: Db;
  mailer: Mailer;
  // null — напоминания выключены
  push: PushGateway | null;
  // null — сервер звука не настроен, войти в комнату нельзя
  voice: VoiceGateway | null;
};

const idParam = z.uuid();

const errorBody = (code: ErrorCode, message: string): ErrorResponse => ({ error: { code, message } });

export async function buildApp({ config, db, mailer, push, voice }: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: config.env !== 'test' });

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  await app.register(rateLimit, {
    max: config.rateLimitPerMinute,
    timeWindow: '1 minute',
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send(errorBody(error.code, error.message));
    }
    if (error instanceof ZodError) {
      return reply.status(400).send(errorBody('validation_error', 'Проверьте введённые данные'));
    }
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 429) {
      return reply.status(429).send(errorBody('too_many_requests', 'Слишком много запросов. Подождите минуту'));
    }
    if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send(errorBody('validation_error', 'Некорректный запрос'));
    }
    app.log.error(error);
    return reply.status(500).send(errorBody('internal_error', 'Что-то пошло не так. Попробуйте позже'));
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send(errorBody('not_found', 'Такого адреса нет')),
  );

  const authDeps: AuthDeps = {
    db,
    config,
    mailer,
    onMailError: (error) => app.log.error(error),
  };
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

  app.post(`${API_PREFIX}/auth/logout`, async (request): Promise<OkResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    await endSession(db, session.sessionId);
    return { ok: true };
  });

  // ---------- Аккаунт: без ника и идентификаторов ----------

  app.get(`${API_PREFIX}/account`, async (request): Promise<AccountResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    const [account] = await db
      .select({ status: accounts.status, bannedUntil: accounts.bannedUntil })
      .from(accounts)
      .where(eq(accounts.id, session.accountId));
    if (!account) throw unauthorized();
    return { status: account.status, bannedUntil: account.bannedUntil?.toISOString() ?? null };
  });

  app.delete(`${API_PREFIX}/account`, async (request): Promise<OkResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    await db.transaction((tx) => deleteAccountAndPersona(tx, session.accountId));
    return { ok: true };
  });

  // ---------- Персона: только ник и personaId ----------

  app.get(`${API_PREFIX}/me`, async (request): Promise<MeResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    return getMe(db, await getPersonaIdForAccount(db, session.accountId));
  });

  app.put(`${API_PREFIX}/me/nickname`, async (request): Promise<MeResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    const { nickname } = setNicknameRequestSchema.parse(request.body);
    return setNickname(db, await getPersonaIdForAccount(db, session.accountId), nickname);
  });

  // ---------- Расписание ----------

  app.get(`${API_PREFIX}/slots`, async (request): Promise<SlotsResponse> => {
    await authenticate(db, request.headers.authorization);
    return { slots: await listUpcomingSlots(db, new Date()) };
  });

  // ---------- Комнаты ----------

  app.post<{ Params: { slotId: string } }>(`${API_PREFIX}/slots/:slotId/join`, async (request): Promise<JoinRoomResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    const slotId = idParam.parse(request.params.slotId);
    const personaId = await getPersonaIdForAccount(db, session.accountId);
    return joinSlot(
      { db, voice, onError: (error) => app.log.error(error) },
      { accountId: session.accountId, personaId },
      slotId,
      new Date(),
    );
  });

  app.post<{ Params: { roomId: string } }>(`${API_PREFIX}/rooms/:roomId/leave`, async (request): Promise<OkResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    const roomId = idParam.parse(request.params.roomId);
    await leaveRoom(db, await getPersonaIdForAccount(db, session.accountId), roomId, new Date());
    return { ok: true };
  });

  // ---------- Напоминания ----------

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

  return app;
}
