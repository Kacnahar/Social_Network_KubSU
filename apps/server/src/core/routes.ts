// Запросы ЯДРА соцсети: состояние сервера, вход, аккаунт, подписка на уведомления.

import {
  API_PREFIX,
  authStartRequestSchema,
  authVerifyRequestSchema,
  pushSubscribeRequestSchema,
  pushUnsubscribeRequestSchema,
  type AccountResponse,
  type AuthStartResponse,
  type AuthVerifyResponse,
  type HealthResponse,
  type OkResponse,
  type PushConfigResponse,
} from '@app/shared';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config';
import type { Db } from '../db/client';
import { getAccountStanding } from './account';
import { authenticate, endSession, startLogin, verifyLogin, type AuthDeps } from './auth/service';
import { ApiError, unauthorized } from './errors';
import { deleteAccountAndPersona } from './identity';
import type { Mailer } from './mailer';
import { removeSubscription, saveSubscription, type PushGateway } from './push/service';

const SERVICE_NAME = 'app-server';
const SERVICE_VERSION = '0.4.0';

export type CoreDeps = {
  config: Config;
  db: Db;
  mailer: Mailer;
  // null — напоминания выключены
  push: PushGateway | null;
};

export function registerCoreRoutes(app: FastifyInstance, { config, db, mailer, push }: CoreDeps): void {
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

  app.post(`${API_PREFIX}/auth/logout`, async (request): Promise<OkResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    await endSession(db, session.sessionId);
    return { ok: true };
  });

  // ---------- Аккаунт: без ника комнат и без идентификаторов ----------

  app.get(`${API_PREFIX}/account`, async (request): Promise<AccountResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    const account = await getAccountStanding(db, session.accountId);
    if (!account) throw unauthorized();
    return { status: account.status, bannedUntil: account.bannedUntil?.toISOString() ?? null };
  });

  app.delete(`${API_PREFIX}/account`, async (request): Promise<OkResponse> => {
    const session = await authenticate(db, request.headers.authorization);
    await db.transaction((tx) => deleteAccountAndPersona(tx, session.accountId));
    return { ok: true };
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
