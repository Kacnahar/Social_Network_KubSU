// Главное правило проекта: ник нельзя связать с аккаунтом ни в одном ответе сервера.

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { decryptEmail } from './crypto';
import { accounts, sessions } from './db/schema';
import { createTestContext, type TestContext } from './testing';

const EMAIL = 'secret.student@example.com';
const NICKNAME = 'Ночной_кот';

describe('анонимность', () => {
  let t: TestContext;
  let token: string;

  beforeAll(async () => {
    t = await createTestContext({ DEV_EXPOSE_LOGIN_CODES: 'true' });
    token = await t.register(EMAIL);
    const headers = t.authed(token);

    // Проходим все адреса сервера, включая ошибки
    await t.app.inject({ method: 'PUT', url: '/v1/me/nickname', headers, payload: { nickname: NICKNAME } });
    await t.app.inject({ method: 'PUT', url: '/v1/me/nickname', headers, payload: { nickname: 'Другой' } });
    await t.app.inject({ method: 'PUT', url: '/v1/me/nickname', headers, payload: { nickname: '!' } });
    await t.app.inject({ method: 'GET', url: '/v1/me', headers });
    await t.app.inject({ method: 'GET', url: '/v1/account', headers });
    await t.app.inject({ method: 'GET', url: '/v1/health' });
    await t.app.inject({ method: 'GET', url: '/v1/me' });
    await t.app.inject({ method: 'POST', url: '/v1/auth/start', payload: { email: EMAIL } });
    await t.app.inject({ method: 'POST', url: '/v1/auth/start', payload: { email: EMAIL, inviteCode: 'NOPE' } });
    await t.app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { email: EMAIL, code: '000000' } });
    await t.app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { email: 'плохо', code: '1' } });
    await t.app.inject({ method: 'GET', url: `/v1/nope?email=${EMAIL}` });
  });

  afterAll(async () => {
    await t.close();
  });

  it('ни один ответ не содержит почту, идентификатор аккаунта или сессии', async () => {
    const [account] = await t.db.select().from(accounts);
    const [session] = await t.db.select().from(sessions);
    const secrets = [EMAIL, EMAIL.split('@')[0]!, account!.id, account!.emailHash, account!.emailEncrypted, session!.id, session!.tokenHash];

    expect(t.responses.length).toBeGreaterThan(10);
    for (const { url, body } of t.responses) {
      for (const secret of secrets) {
        expect(body, `ответ ${url}`).not.toContain(secret);
      }
      expect(body, `ответ ${url}`).not.toMatch(/account_?id|email/i);
    }
  });

  it('данные аккаунта и данные персоны не встречаются в одном ответе', async () => {
    const me = t.responses.findLast((item) => item.url === '/v1/me' && item.body.includes('personaId'))!;
    const personaId = JSON.parse(me.body).personaId as string;

    const account = t.responses.find((item) => item.url === '/v1/account')!;
    expect(account.body).not.toContain(personaId);
    expect(account.body).not.toContain(NICKNAME);
    expect(Object.keys(JSON.parse(account.body)).sort()).toEqual(['bannedUntil', 'status']);
    expect(Object.keys(JSON.parse(me.body)).sort()).toEqual(['nickname', 'nicknameChangeAvailableAt', 'personaId']);
  });

  it('почта лежит в базе зашифрованной, и расшифровать её можно только ключом', async () => {
    const [account] = await t.db.select().from(accounts);
    expect(JSON.stringify(account)).not.toContain(EMAIL);
    expect(decryptEmail(account!.emailEncrypted, t.config.emailEncryptionKey)).toBe(EMAIL);
    expect(() => decryptEmail(account!.emailEncrypted, Buffer.alloc(32, 9))).toThrow();
  });

  it('токен сессии не хранится в базе в открытом виде', async () => {
    const [session] = await t.db.select().from(sessions);
    expect(JSON.stringify(session)).not.toContain(token);
  });
});

describe('устройство кода', () => {
  const srcDir = fileURLToPath(new URL('.', import.meta.url));

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return entry.name.endsWith('.ts') ? [path] : [];
    });
  }

  it('таблицу связи «аккаунт ↔ персона» использует только модуль identity', () => {
    const allowed = ['db/schema.ts', 'identity/index.ts', 'anonymity.test.ts'];
    const offenders = sourceFiles(srcDir)
      .map((path) => relative(srcDir, path))
      .filter((path) => !allowed.includes(path))
      .filter((path) => /personaLinks|persona_links/.test(readFileSync(join(srcDir, path), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
