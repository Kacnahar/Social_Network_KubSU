import { healthResponseSchema } from '@rooms/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from './config';
import { createTestContext, type TestContext } from './testing';

describe('сервер', () => {
  let t: TestContext;

  beforeAll(async () => {
    t = await createTestContext();
  });

  afterAll(async () => {
    await t.close();
  });

  it('GET /v1/health отвечает ok в согласованном формате', async () => {
    const response = await t.app.inject({ method: 'GET', url: '/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.safeParse(response.json()).success).toBe(true);
  });

  it('разрешает запросы от веб-приложения', async () => {
    const response = await t.app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: 'http://localhost:8081' },
    });
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
  });

  it('не разрешает запросы с чужих сайтов', async () => {
    const response = await t.app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('на неизвестный адрес отвечает 404 в общем формате ошибок', async () => {
    const response = await t.app.inject({ method: 'GET', url: '/v1/nope' });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('not_found');
  });

  it('на битый JSON отвечает 400, а не 500', async () => {
    const response = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/start',
      headers: { 'content-type': 'application/json' },
      payload: '{не json',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('validation_error');
  });
});

describe('настройки', () => {
  const production = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://localhost/rooms',
    EMAIL_HASH_KEY: 'a-long-enough-secret-key',
    EMAIL_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  };

  it('в продакшене требует базу и ключи', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow();
    expect(() => loadConfig({ ...production, EMAIL_ENCRYPTION_KEY: undefined })).toThrow();
    expect(loadConfig(production).devExposeLoginCodes).toBe(false);
    expect(loadConfig(production).devSeedInviteCode).toBeNull();
  });

  it('в продакшене запрещает показывать код входа и тестовое приглашение', () => {
    expect(() => loadConfig({ ...production, DEV_EXPOSE_LOGIN_CODES: 'true' })).toThrow();
    expect(() => loadConfig({ ...production, DEV_SEED_INVITE_CODE: 'X' })).toThrow();
  });

  it('отклоняет ключ шифрования неправильной длины', () => {
    expect(() => loadConfig({ EMAIL_ENCRYPTION_KEY: 'c2hvcnQ=' })).toThrow();
  });
});
