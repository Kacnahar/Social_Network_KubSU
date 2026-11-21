import { healthResponseSchema } from '@rooms/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { loadConfig } from './config';

describe('сервер', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(loadConfig({ CORS_ORIGINS: 'http://localhost:8081' }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health отвечает ok в согласованном формате', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.safeParse(response.json()).success).toBe(true);
  });

  it('разрешает запросы от веб-приложения', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: 'http://localhost:8081' },
    });
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
  });

  it('не разрешает запросы с чужих сайтов', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('на неизвестный адрес отвечает 404', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/nope' });
    expect(response.statusCode).toBe(404);
  });
});
