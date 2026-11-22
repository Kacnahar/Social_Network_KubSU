// Сборка сервера: общая часть (ограничения, ошибки) + ядро соцсети + модули.
// Новый модуль подключается одной строкой в конце buildApp.

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import type { ErrorCode, ErrorResponse } from '@app/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { Config } from './config';
import { ApiError } from './core/errors';
import type { Mailer } from './core/mailer';
import type { MediaStorage } from './core/media/storage';
import type { PushGateway } from './core/push/service';
import { registerCoreRoutes } from './core/routes';
import type { Db } from './db/client';
import { registerRoomsRoutes } from './modules/rooms/routes';
import type { VoiceGateway } from './modules/rooms/voice/gateway';

export type AppDeps = {
  config: Config;
  db: Db;
  mailer: Mailer;
  // null — напоминания выключены
  push: PushGateway | null;
  // null — сервер звука не настроен, войти в комнату нельзя
  voice: VoiceGateway | null;
  // Где хранятся фото
  media: MediaStorage;
  // Сообщает о каждом зарегистрированном адресе — для автотестов, которые проверяют все адреса сразу
  onRoute?: (route: { method: string; url: string }) => void;
};

const errorBody = (code: ErrorCode, message: string): ErrorResponse => ({ error: { code, message } });

export async function buildApp({ config, db, mailer, push, voice, media, onRoute }: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: config.env !== 'test' });

  if (onRoute) {
    app.addHook('onRoute', (route) => {
      for (const method of [route.method].flat()) onRoute({ method, url: route.url });
    });
  }

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
    if (statusCode === 413) {
      return reply.status(413).send(errorBody('media_too_large', 'Файл слишком большой'));
    }
    if (statusCode === 415) {
      return reply.status(415).send(errorBody('media_invalid', 'Такой тип файла не подходит'));
    }
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

  registerCoreRoutes(app, { config, db, mailer, push, media });
  registerRoomsRoutes(app, { db, voice });

  return app;
}
