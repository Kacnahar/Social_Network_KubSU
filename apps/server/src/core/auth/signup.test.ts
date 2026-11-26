import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../../config';
import { accounts, emailLoginCodes, sessions } from '../../db/schema';
import { runMaintenance } from '../../maintenance';
import { createTestContext, type TestContext } from '../../testing';
import { ensureDevTestAccounts } from '../devAccounts';

const STUDENT = { role: 'student', lastName: 'Петров', firstName: 'Иван', gender: 'male', birthDate: '2005-03-14' };
const TEACHER = { role: 'teacher', lastName: 'Лебедева', firstName: 'Елена', patronymic: 'Викторовна', staffId: 'T-0042' };

describe('регистрация с анкетой, гость и тестовые аккаунты', () => {
  let t: TestContext;

  beforeAll(async () => {
    t = await createTestContext({ DEV_TEST_ACCOUNTS: 'true' });
  });

  afterAll(async () => {
    await t.close();
  });

  const start = (payload: Record<string, unknown>) => t.app.inject({ method: 'POST', url: '/v1/auth/start', payload });
  const verify = (email: string, code: string) => t.app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { email, code } });
  const get = (url: string, token: string) => t.app.inject({ method: 'GET', url, headers: t.authed(token) });
  const signUp = async (email: string, signup: Record<string, unknown>): Promise<string> => {
    const started = await start({ email, signup });
    expect(started.statusCode, started.body).toBe(200);
    const verified = await verify(email, t.mailer.lastCodeFor(email));
    expect(verified.statusCode, verified.body).toBe(200);
    return verified.json().token;
  };

  describe('анкета', () => {
    it('студент: роль, готовый профиль и анкета в аккаунте; наружу личные данные не уходят', async () => {
      const token = await signUp('ivan@example.com', STUDENT);

      expect((await get('/v1/account', token)).json().role).toBe('student');
      const mine = (await get('/v1/profile', token)).json();
      expect(mine.profile).toMatchObject({ displayName: 'Иван Петров', role: 'student', birthDate: '2005-03-14', username: null });
      expect(mine.privacy).toEqual({ showFaculty: true, showBirth: false, showFriends: true, showOnline: true });

      const [account] = await t.db.select().from(accounts).where(eq(accounts.lastName, 'Петров'));
      expect(account).toMatchObject({ firstName: 'Иван', gender: 'male', inviteCodeId: null, staffId: null });
      // Анкета не остаётся лежать рядом с кодом
      expect(await t.db.select().from(emailLoginCodes)).toHaveLength(0);
      // Студенту открыты комнаты
      expect((await get('/v1/rooms/me', token)).statusCode).toBe(200);
    });

    it('преподаватель: роль, ФИО в профиле, номер только в аккаунте, комнаты закрыты', async () => {
      const token = await signUp('elena@example.com', TEACHER);

      expect((await get('/v1/account', token)).json().role).toBe('teacher');
      const mine = (await get('/v1/profile', token)).json();
      expect(mine.profile.displayName).toBe('Елена Викторовна Лебедева');
      expect(JSON.stringify(mine)).not.toContain('T-0042');
      const [account] = await t.db.select().from(accounts).where(eq(accounts.staffId, 'T-0042'));
      expect(account).toMatchObject({ role: 'teacher', patronymic: 'Викторовна', gender: null });
      expect((await get('/v1/rooms/me', token)).statusCode).toBe(403);
    });

    it('преподаватель без отчества', async () => {
      const token = await signUp('noname@example.com', { ...TEACHER, patronymic: null, staffId: 'T-1' });
      expect((await get('/v1/profile', token)).json().profile.displayName).toBe('Елена Лебедева');
    });

    it('почта уже зарегистрирована: это вход, роль и профиль не меняются', async () => {
      const token = await signUp('ivan@example.com', { ...TEACHER, staffId: 'T-2' });
      expect((await get('/v1/account', token)).json().role).toBe('student');
      expect((await get('/v1/profile', token)).json().profile.displayName).toBe('Иван Петров');
    });

    it('отклоняет плохую анкету', async () => {
      const today = new Date();
      const tooYoung = `${today.getFullYear() - 10}-01-01`;
      const bad: Record<string, unknown>[] = [
        { ...STUDENT, birthDate: tooYoung },
        { ...STUDENT, birthDate: '2999-01-01' },
        { ...STUDENT, birthDate: '14.03.2005' },
        { ...STUDENT, gender: 'other' },
        { ...STUDENT, firstName: 'Иван2' },
        { ...STUDENT, lastName: '' },
        { ...STUDENT, role: 'guest' },
        { ...STUDENT, role: 'admin' },
        { ...TEACHER, staffId: '' },
        { ...TEACHER, staffId: 'a b' },
        { role: 'teacher', lastName: 'Лебедева', firstName: 'Елена', staffId: 'T-3' },
        { ...STUDENT, firstName: 'А'.repeat(40), lastName: 'Б'.repeat(40) },
      ];
      for (const [index, signup] of bad.entries()) {
        const response = await start({ email: `bad${index}@example.com`, signup });
        expect(response.statusCode, JSON.stringify(signup)).toBe(400);
      }
    });

    it('без анкеты и без приглашения новый аккаунт не создаётся', async () => {
      expect((await start({ email: 'nobody@example.com' })).statusCode).toBe(200);
      expect(() => t.mailer.lastCodeFor('nobody@example.com')).toThrow();
    });
  });

  describe('гость без регистрации', () => {
    const guest = async (): Promise<string> => {
      const response = await t.app.inject({ method: 'POST', url: '/v1/auth/guest' });
      expect(response.statusCode).toBe(200);
      return response.json().token;
    };

    it('входит одной кнопкой: роль «гость», смотреть можно, менять нельзя', async () => {
      const token = await guest();
      expect((await get('/v1/account', token)).json()).toMatchObject({ role: 'guest', isAdmin: false, status: 'active' });
      expect((await get('/v1/profile', token)).json()).toEqual({ profile: null, privacy: null });
      expect((await get('/v1/feed', token)).statusCode).toBe(200);
      expect((await get('/v1/stories', token)).statusCode).toBe(200);

      const headers = t.authed(token);
      expect((await t.app.inject({ method: 'POST', url: '/v1/posts', headers, payload: { text: 'привет' } })).statusCode).toBe(403);
      expect((await t.app.inject({ method: 'POST', url: '/v1/stories', headers, payload: {} })).statusCode).toBe(403);
      expect((await get('/v1/rooms/me', token)).statusCode).toBe(403);
    });

    it('выход удаляет гостевой аккаунт', async () => {
      const before = (await t.db.select().from(accounts)).length;
      const token = await guest();
      expect((await t.db.select().from(accounts)).length).toBe(before + 1);
      expect((await t.app.inject({ method: 'POST', url: '/v1/auth/logout', headers: t.authed(token) })).statusCode).toBe(200);
      expect((await t.db.select().from(accounts)).length).toBe(before);
      expect((await get('/v1/account', token)).statusCode).toBe(401);
    });

    it('выход обычного человека аккаунт не удаляет', async () => {
      const token = await signUp('stay@example.com', { ...STUDENT, lastName: 'Остаюсь' });
      await t.app.inject({ method: 'POST', url: '/v1/auth/logout', headers: t.authed(token) });
      expect(await t.db.select().from(accounts).where(eq(accounts.lastName, 'Остаюсь'))).toHaveLength(1);
    });

    it('уборка удаляет гостей с истёкшей сессией и не трогает остальных', async () => {
      const alive = await guest();
      await guest();
      const all = await t.db.select().from(sessions);
      const last = all.at(-1)!;
      await t.db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, last.id));
      const before = (await t.db.select().from(accounts)).length;

      await runMaintenance({ db: t.db, media: t.media }, new Date());

      expect((await t.db.select().from(accounts)).length).toBe(before - 1);
      expect((await get('/v1/account', alive)).statusCode).toBe(200);
    });
  });

  describe('тестовые аккаунты разработки', () => {
    it('создаются один раз и входят по коду 0000', async () => {
      await ensureDevTestAccounts(t.db, t.config, new Date());
      const count = (await t.db.select().from(accounts)).length;
      await ensureDevTestAccounts(t.db, t.config, new Date());
      expect((await t.db.select().from(accounts)).length).toBe(count);

      for (const [email, role] of [['1@mail.ru', 'student'], ['2@mail.ru', 'student'], ['3@mail.ru', 'teacher']] as const) {
        // Дважды подряд: ожидания между отправками для тестовых почт нет
        expect((await start({ email })).statusCode).toBe(200);
        expect((await start({ email })).statusCode).toBe(200);
        const verified = await verify(email, '0000');
        expect(verified.statusCode, verified.body).toBe(200);
        expect((await get('/v1/account', verified.json().token)).json().role).toBe(role);
        expect((await get('/v1/profile', verified.json().token)).json().profile).not.toBeNull();
      }
    });

    it('другим почтам код 0000 не подходит', async () => {
      await start({ email: 'ivan@example.com' });
      expect((await verify('ivan@example.com', '0000')).statusCode).toBe(400);
    });

    it('без настройки DEV_TEST_ACCOUNTS код 0000 не действует даже для тестовой почты', async () => {
      const plain = await createTestContext();
      try {
        await ensureDevTestAccounts(plain.db, plain.config, new Date());
        expect(plain.config.devTestAccounts).toBe(false);
        await plain.app.inject({ method: 'POST', url: '/v1/auth/start', payload: { email: '1@mail.ru' } });
        expect(plain.mailer.lastCodeFor('1@mail.ru')).toMatch(/^\d{6}$/);
        const response = await plain.app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { email: '1@mail.ru', code: '0000' } });
        expect(response.statusCode).toBe(400);
      } finally {
        await plain.close();
      }
    });

    it('в продакшене настройку включить нельзя', () => {
      const production = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://u:p@localhost/db',
        EMAIL_HASH_KEY: 'k'.repeat(32),
        EMAIL_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
      };
      expect(loadConfig(production).devTestAccounts).toBe(false);
      expect(() => loadConfig({ ...production, DEV_TEST_ACCOUNTS: 'true' })).toThrow();
    });
  });
});
