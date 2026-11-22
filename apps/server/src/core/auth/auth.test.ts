import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inviteCodes } from '../../db/schema';
import { createInviteCode } from '../invites';
import { TEST_INVITE, createTestContext, type TestContext } from '../../testing';

const EMAIL = 'student@example.com';
const MINUTE = 60 * 1000;

describe('вход', () => {
  let t: TestContext;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    t = await createTestContext();
  });

  afterEach(async () => {
    await t.close();
    vi.useRealTimers();
  });

  const start = (payload: Record<string, unknown>) =>
    t.app.inject({ method: 'POST', url: '/v1/auth/start', payload });
  const verify = (email: string, code: string) =>
    t.app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { email, code } });
  const inviteUses = async (code: string) => {
    const [invite] = await t.db.select().from(inviteCodes).where(eq(inviteCodes.code, code));
    return invite!.usedCount;
  };
  const wrongCodeFor = (email: string) => (t.mailer.lastCodeFor(email) === '000000' ? '111111' : '000000');

  describe('регистрация по коду приглашения', () => {
    it('создаёт аккаунт, выдаёт токен и тратит одно использование приглашения', async () => {
      const token = await t.register(EMAIL);
      expect(token.length).toBeGreaterThan(20);
      expect(await inviteUses(TEST_INVITE)).toBe(1);

      const me = await t.app.inject({ method: 'GET', url: '/v1/rooms/me', headers: t.authed(token) });
      expect(me.statusCode).toBe(200);
      expect(me.json().nickname).toBeNull();
    });

    it('принимает код приглашения и почту в любом регистре и с пробелами', async () => {
      const response = await start({ email: '  Student@Example.COM ', inviteCode: ' test-invite ' });
      expect(response.statusCode).toBe(200);
      expect(t.mailer.sent[0]?.email).toBe(EMAIL);
    });

    it('отклоняет неизвестный код приглашения и не шлёт письмо', async () => {
      const response = await start({ email: EMAIL, inviteCode: 'NOPE' });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('invalid_invite');
      expect(t.mailer.sent).toHaveLength(0);
    });

    it('отклоняет просроченный код приглашения', async () => {
      await createInviteCode(t.db, { code: 'OLD', label: 'старый', maxUses: 10, expiresAt: new Date(Date.now() - MINUTE) });
      expect((await start({ email: EMAIL, inviteCode: 'OLD' })).json().error.code).toBe('invalid_invite');
    });

    it('не даёт использовать приглашение больше положенного числа раз', async () => {
      await createInviteCode(t.db, { code: 'ONE', label: 'одноразовый', maxUses: 1 });
      await t.register('first@example.com', 'ONE');
      expect((await start({ email: 'second@example.com', inviteCode: 'ONE' })).json().error.code).toBe('invalid_invite');
    });

    it('если двое запросили код по последнему месту в приглашении, проходит только первый', async () => {
      await createInviteCode(t.db, { code: 'ONE', label: 'одноразовый', maxUses: 1 });
      await start({ email: 'first@example.com', inviteCode: 'ONE' });
      await start({ email: 'second@example.com', inviteCode: 'ONE' });

      expect((await verify('first@example.com', t.mailer.lastCodeFor('first@example.com'))).statusCode).toBe(200);
      const second = await verify('second@example.com', t.mailer.lastCodeFor('second@example.com'));
      expect(second.statusCode).toBe(400);
      expect(second.json().error.code).toBe('invalid_invite');
      expect(await inviteUses('ONE')).toBe(1);
    });

    it('повторная регистрация с той же почтой просто входит и не тратит приглашение', async () => {
      const first = await t.register(EMAIL);
      vi.setSystemTime(Date.now() + 2 * MINUTE);
      const second = await t.register(EMAIL);

      const idOf = async (token: string) =>
        (await t.app.inject({ method: 'GET', url: '/v1/rooms/me', headers: t.authed(token) })).json().personaId;
      expect(await idOf(second)).toBe(await idOf(first));
      expect(await inviteUses(TEST_INVITE)).toBe(1);
    });
  });

  describe('вход без приглашения', () => {
    it('пускает существующий аккаунт', async () => {
      await t.register(EMAIL);
      vi.setSystemTime(Date.now() + 2 * MINUTE);

      expect((await start({ email: EMAIL })).statusCode).toBe(200);
      const response = await verify(EMAIL, t.mailer.lastCodeFor(EMAIL));
      expect(response.statusCode).toBe(200);
      expect(await inviteUses(TEST_INVITE)).toBe(1);
    });

    it('для незнакомой почты отвечает так же, но письмо не шлёт и войти не даёт', async () => {
      await t.register(EMAIL);
      vi.setSystemTime(Date.now() + 2 * MINUTE);

      const known = await start({ email: EMAIL });
      const unknown = await start({ email: 'stranger@example.com' });
      expect(unknown.statusCode).toBe(known.statusCode);
      expect(unknown.json()).toEqual(known.json());
      expect(t.mailer.sent.filter((item) => item.email === 'stranger@example.com')).toHaveLength(0);

      for (const code of ['000000', '123456', '999999']) {
        expect((await verify('stranger@example.com', code)).json().error.code).toBe('invalid_code');
      }
    });
  });

  describe('код из письма', () => {
    it('неверный код не подходит', async () => {
      await start({ email: EMAIL, inviteCode: TEST_INVITE });
      const response = await verify(EMAIL, wrongCodeFor(EMAIL));
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('invalid_code');
    });

    it('после 5 неверных попыток не подходит даже верный код', async () => {
      await start({ email: EMAIL, inviteCode: TEST_INVITE });
      for (let attempt = 0; attempt < 5; attempt++) await verify(EMAIL, wrongCodeFor(EMAIL));
      expect((await verify(EMAIL, t.mailer.lastCodeFor(EMAIL))).json().error.code).toBe('invalid_code');
    });

    it('перестаёт действовать через 10 минут', async () => {
      await start({ email: EMAIL, inviteCode: TEST_INVITE });
      vi.setSystemTime(Date.now() + 11 * MINUTE);
      expect((await verify(EMAIL, t.mailer.lastCodeFor(EMAIL))).json().error.code).toBe('invalid_code');
    });

    it('нельзя использовать дважды', async () => {
      await start({ email: EMAIL, inviteCode: TEST_INVITE });
      const code = t.mailer.lastCodeFor(EMAIL);
      expect((await verify(EMAIL, code)).statusCode).toBe(200);
      expect((await verify(EMAIL, code)).json().error.code).toBe('invalid_code');
    });

    it('новый код отменяет старый', async () => {
      await start({ email: EMAIL, inviteCode: TEST_INVITE });
      const oldCode = t.mailer.lastCodeFor(EMAIL);
      vi.setSystemTime(Date.now() + 2 * MINUTE);
      await start({ email: EMAIL, inviteCode: TEST_INVITE });
      const newCode = t.mailer.lastCodeFor(EMAIL);

      if (oldCode !== newCode) {
        expect((await verify(EMAIL, oldCode)).json().error.code).toBe('invalid_code');
      }
      expect((await verify(EMAIL, newCode)).statusCode).toBe(200);
    });

    it('повторно запросить код можно не раньше чем через минуту', async () => {
      await start({ email: EMAIL, inviteCode: TEST_INVITE });
      const tooSoon = await start({ email: EMAIL, inviteCode: TEST_INVITE });
      expect(tooSoon.statusCode).toBe(429);
      expect(tooSoon.json().error.code).toBe('too_many_requests');
      expect(t.mailer.sent).toHaveLength(1);

      vi.setSystemTime(Date.now() + MINUTE + 1000);
      expect((await start({ email: EMAIL, inviteCode: TEST_INVITE })).statusCode).toBe(200);
    });

    it('не показывает код в ответе, если это не включено', async () => {
      const response = await start({ email: EMAIL, inviteCode: TEST_INVITE });
      expect(response.json()).toEqual({ ok: true });
    });
  });

  describe('проверка данных', () => {
    it.each([
      ['не почта', { email: 'не почта', inviteCode: TEST_INVITE }],
      ['без почты', { inviteCode: TEST_INVITE }],
      ['пустое тело', {}],
    ])('auth/start отклоняет: %s', async (_name, payload) => {
      const response = await start(payload);
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('validation_error');
    });

    it('auth/verify отклоняет код не из 6 цифр', async () => {
      const response = await verify(EMAIL, 'abcdef');
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('validation_error');
    });
  });

  describe('сессия', () => {
    it('без токена и с чужим токеном отвечает 401', async () => {
      for (const headers of [{}, { authorization: 'Bearer nope' }, { authorization: 'nope' }]) {
        for (const url of ['/v1/rooms/me', '/v1/account']) {
          const response = await t.app.inject({ method: 'GET', url, headers });
          expect(response.statusCode).toBe(401);
          expect(response.json().error.code).toBe('unauthorized');
        }
      }
    });

    it('после выхода токен перестаёт работать', async () => {
      const token = await t.register(EMAIL);
      const logout = await t.app.inject({ method: 'POST', url: '/v1/auth/logout', headers: t.authed(token) });
      expect(logout.statusCode).toBe(200);
      expect((await t.app.inject({ method: 'GET', url: '/v1/rooms/me', headers: t.authed(token) })).statusCode).toBe(401);
    });

    it('выход на одном устройстве не трогает другое', async () => {
      const phone = await t.register(EMAIL);
      vi.setSystemTime(Date.now() + 2 * MINUTE);
      const laptop = await t.register(EMAIL);
      await t.app.inject({ method: 'POST', url: '/v1/auth/logout', headers: t.authed(phone) });
      expect((await t.app.inject({ method: 'GET', url: '/v1/rooms/me', headers: t.authed(laptop) })).statusCode).toBe(200);
    });

    it('перестаёт действовать через 90 дней', async () => {
      const token = await t.register(EMAIL);
      vi.setSystemTime(Date.now() + 91 * 24 * 60 * MINUTE);
      expect((await t.app.inject({ method: 'GET', url: '/v1/rooms/me', headers: t.authed(token) })).statusCode).toBe(401);
    });
  });
});

describe('вход: режимы', () => {
  it('в режиме разработки возвращает код в ответе', async () => {
    const t = await createTestContext({ DEV_EXPOSE_LOGIN_CODES: 'true' });
    const response = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/start',
      payload: { email: EMAIL, inviteCode: TEST_INVITE },
    });
    expect(response.json().devCode).toBe(t.mailer.lastCodeFor(EMAIL));
    await t.close();
  });

  it('ограничивает частоту запросов на вход', async () => {
    const t = await createTestContext({ AUTH_RATE_LIMIT_PER_MINUTE: '2' });
    const attempt = (n: number) =>
      t.app.inject({ method: 'POST', url: '/v1/auth/start', payload: { email: `user${n}@example.com`, inviteCode: 'NOPE' } });
    expect((await attempt(1)).statusCode).toBe(400);
    expect((await attempt(2)).statusCode).toBe(400);
    const limited = await attempt(3);
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe('too_many_requests');
    await t.close();
  });
});
