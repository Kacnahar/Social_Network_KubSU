import cors from '@fastify/cors';
import { API_PREFIX, type HealthResponse } from '@rooms/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';

const SERVICE_NAME = 'rooms-server';
const SERVICE_VERSION = '0.0.0';

export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  await app.register(cors, { origin: config.corsOrigins });

  app.get(`${API_PREFIX}/health`, async (): Promise<HealthResponse> => ({
    status: 'ok',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    time: new Date().toISOString(),
  }));

  return app;
}
