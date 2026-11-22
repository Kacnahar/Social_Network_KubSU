// Главное правило проекта: ник нельзя связать с аккаунтом ни в одном ответе сервера.

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { decryptEmail } from './core/crypto';
import { accounts, sessions, slots } from './db/schema';
import { createTestContext, type TestContext } from './testing';

const EMAIL = 'secret.student@example.com';
const NICKNAME = 'Ночной_кот';
const DISPLAY_NAME = 'Анна Секретова';

describe('анонимность', () => {
  let t: TestContext;
  let token: string;

  beforeAll(async () => {
    t = await createTestContext({ DEV_EXPOSE_LOGIN_CODES: 'true' });
    token = await t.register(EMAIL);
    const headers = t.authed(token);

    // Проходим все адреса сервера, включая ошибки
    await t.app.inject({ method: 'PUT', url: '/v1/rooms/me/nickname', headers, payload: { nickname: NICKNAME } });
    await t.app.inject({ method: 'PUT', url: '/v1/rooms/me/nickname', headers, payload: { nickname: 'Другой' } });
    await t.app.inject({ method: 'PUT', url: '/v1/rooms/me/nickname', headers, payload: { nickname: '!' } });
    await t.app.inject({ method: 'GET', url: '/v1/rooms/me', headers });
    await t.app.inject({ method: 'GET', url: '/v1/account', headers });
    await t.app.inject({ method: 'GET', url: '/v1/health' });
    await t.app.inject({ method: 'GET', url: '/v1/rooms/me' });
    // Профиль соцсети — открытая личность того же человека
    await t.app.inject({ method: 'GET', url: '/v1/profile', headers });
    const saved = await t.app.inject({ method: 'PUT', url: '/v1/profile', headers, payload: { displayName: DISPLAY_NAME, faculty: 'ФКТиПМ', course: 2 } });
    await t.app.inject({ method: 'GET', url: '/v1/profile', headers });
    await t.app.inject({ method: 'GET', url: `/v1/profiles/${saved.json().profile.profileId}`, headers });
    await t.app.inject({ method: 'GET', url: '/v1/profiles/not-an-id', headers });
    await t.app.inject({ method: 'PUT', url: '/v1/profile', headers, payload: { displayName: '' } });
    await t.app.inject({ method: 'POST', url: '/v1/media?purpose=avatar', headers: { ...headers, 'content-type': 'image/jpeg' }, payload: Buffer.from('не фото') });
    // Посты, лайки, комментарии, жалобы — всё от имени открытого профиля
    const post = await t.app.inject({ method: 'POST', url: '/v1/posts', headers, payload: { text: 'Первый пост' } });
    const postId = post.json().postId as string;
    await t.app.inject({ method: 'GET', url: `/v1/posts/${postId}`, headers });
    await t.app.inject({ method: 'PUT', url: `/v1/posts/${postId}/like`, headers });
    const comment = await t.app.inject({ method: 'POST', url: `/v1/posts/${postId}/comments`, headers, payload: { text: 'комментарий' } });
    await t.app.inject({ method: 'GET', url: `/v1/posts/${postId}/comments`, headers });
    await t.app.inject({ method: 'GET', url: `/v1/profiles/${saved.json().profile.profileId}/posts`, headers });
    await t.app.inject({ method: 'POST', url: `/v1/posts/${postId}/report`, headers, payload: { reason: 'тест' } });
    await t.app.inject({ method: 'DELETE', url: `/v1/posts/comments/${comment.json().commentId}`, headers });
    await t.app.inject({ method: 'DELETE', url: `/v1/posts/${postId}/like`, headers });
    await t.app.inject({ method: 'POST', url: '/v1/posts', headers, payload: {} });
    await t.app.inject({ method: 'GET', url: '/v1/feed', headers });
    await t.app.inject({ method: 'GET', url: '/v1/feed?before=x', headers });
    // Истории
    await t.app.inject({ method: 'GET', url: '/v1/stories', headers });
    await t.app.inject({ method: 'POST', url: '/v1/stories', headers, payload: {} });
    await t.app.inject({ method: 'POST', url: `/v1/stories/${postId}/view`, headers });
    await t.app.inject({ method: 'GET', url: `/v1/stories/${postId}/viewers`, headers });
    await t.app.inject({ method: 'DELETE', url: `/v1/stories/${postId}`, headers });
    await t.app.inject({ method: 'POST', url: '/v1/auth/start', payload: { email: EMAIL } });
    await t.app.inject({ method: 'POST', url: '/v1/auth/start', payload: { email: EMAIL, inviteCode: 'NOPE' } });
    await t.app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { email: EMAIL, code: '000000' } });
    await t.app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { email: 'плохо', code: '1' } });
    await t.app.inject({ method: 'GET', url: `/v1/nope?email=${EMAIL}` });
    await t.app.inject({ method: 'GET', url: '/v1/rooms/slots', headers });
    const [slot] = await t.db
      .insert(slots)
      .values({ title: 'Комната', startsAt: new Date(Date.now() - 60_000), durationMinutes: 45, createdAt: new Date() })
      .returning();
    const joined = await t.app.inject({ method: 'POST', url: `/v1/rooms/slots/${slot!.id}/join`, headers });
    await t.app.inject({ method: 'POST', url: `/v1/rooms/${joined.json().roomId}/leave`, headers });
    await t.app.inject({ method: 'POST', url: '/v1/rooms/slots/not-an-id/join', headers });
    await t.app.inject({ method: 'GET', url: '/v1/push/config' });
    const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/device-1', keys: { p256dh: 'k', auth: 'a' } };
    await t.app.inject({ method: 'POST', url: '/v1/push/subscriptions', headers, payload: subscription });
    await t.app.inject({ method: 'POST', url: '/v1/push/subscriptions', headers, payload: { endpoint: 'https://evil.example/x', keys: subscription.keys } });
    await t.app.inject({ method: 'DELETE', url: '/v1/push/subscriptions', headers, payload: { endpoint: subscription.endpoint } });
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

  it('серверу звука сообщаются только персона и ник', async () => {
    const [account] = await t.db.select().from(accounts);
    const issued = JSON.stringify(t.voice.tokens);
    expect(t.voice.tokens).toHaveLength(1);
    expect(issued).toContain(NICKNAME);
    for (const secret of [EMAIL, account!.id, account!.emailHash]) expect(issued).not.toContain(secret);
  });

  it('ни один ответ не связывает профиль соцсети с ником комнат', async () => {
    const persona = JSON.parse(t.responses.findLast((item) => item.url === '/v1/rooms/me' && item.body.includes('personaId'))!.body);
    const profile = JSON.parse(t.responses.findLast((item) => item.url === '/v1/profile' && item.body.includes('profileId'))!.body).profile;
    expect(persona.nickname).toBe(NICKNAME);
    expect(profile.displayName).toBe(DISPLAY_NAME);

    const profileMarks = [profile.profileId, DISPLAY_NAME, 'profileId', 'displayName', 'avatarUrl'];
    const personaMarks = [persona.personaId, NICKNAME, 'personaId', 'nickname'];
    let withProfile = 0;
    let withPersona = 0;
    for (const { url, body } of t.responses) {
      const hasProfile = profileMarks.some((mark) => body.includes(mark));
      const hasPersona = personaMarks.some((mark) => body.includes(mark));
      withProfile += Number(hasProfile);
      withPersona += Number(hasPersona);
      expect(hasProfile && hasPersona, `ответ ${url} содержит и профиль, и персону комнат`).toBe(false);
    }
    // Проверка не пустая: оба вида ответов в прогоне действительно были
    expect(withProfile).toBeGreaterThan(0);
    expect(withPersona).toBeGreaterThan(0);
  });

  it('пропуск на сервер звука не содержит данных профиля', () => {
    expect(JSON.stringify(t.voice.tokens)).not.toContain(DISPLAY_NAME);
  });

  it('данные аккаунта и данные персоны не встречаются в одном ответе', async () => {
    const me = t.responses.findLast((item) => item.url === '/v1/rooms/me' && item.body.includes('personaId'))!;
    const personaId = JSON.parse(me.body).personaId as string;

    const account = t.responses.find((item) => item.url === '/v1/account')!;
    expect(account.body).not.toContain(personaId);
    expect(account.body).not.toContain(NICKNAME);
    expect(Object.keys(JSON.parse(account.body)).sort()).toEqual(['bannedUntil', 'role', 'status']);
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
    const allowed = ['db/schema/bridge.ts', 'core/identity/index.ts', 'anonymity.test.ts'];
    const offenders = sourceFiles(srcDir)
      .map((path) => relative(srcDir, path))
      .filter((path) => !allowed.includes(path))
      .filter((path) => /personaLinks|persona_links/.test(readFileSync(join(srcDir, path), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
