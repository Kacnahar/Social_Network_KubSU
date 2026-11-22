import { ROLES, type Role } from '@app/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { accounts, personas, slots } from '../db/schema';
import { createTestContext, type TestContext } from '../testing';

const SOME_ID = '00000000-0000-4000-8000-000000000000';

describe('роли', () => {
  let t: TestContext;
  const tokens = {} as Record<Role, string>;

  beforeAll(async () => {
    t = await createTestContext();
    for (const role of ROLES) tokens[role] = await t.registerAs(role, `${role}@example.com`);
    await t.db.insert(slots).values({ title: 'Комната', startsAt: new Date(Date.now() - 60_000), durationMinutes: 45, createdAt: new Date() });
  });

  afterAll(async () => {
    await t.close();
  });

  const call = (method: string, url: string, role: Role) =>
    t.app.inject({
      method: method as 'GET',
      url: url.replace(/:[a-zA-Z]+/g, SOME_ID),
      headers: t.authed(tokens[role]),
      ...(method === 'GET' ? {} : { payload: {} }),
    });

  it('роль берётся из типа кода приглашения и видна в аккаунте', async () => {
    for (const role of ROLES) {
      const response = await t.app.inject({ method: 'GET', url: '/v1/account', headers: t.authed(tokens[role]) });
      expect(response.json().role).toBe(role);
    }
  });

  it('у модуля комнат есть адреса, и тест видит их все', () => {
    const roomsRoutes = t.routes.filter((route) => route.url.startsWith('/v1/rooms') && route.method !== 'HEAD');
    expect(roomsRoutes.length).toBeGreaterThanOrEqual(5);
  });

  it.each(['teacher', 'guest'] as const)('%s получает отказ на КАЖДОМ запросе комнат', async (role) => {
    const roomsRoutes = t.routes.filter((route) => route.url.startsWith('/v1/rooms') && route.method !== 'HEAD');
    for (const route of roomsRoutes) {
      const response = await call(route.method, route.url, role);
      expect(response.statusCode, `${route.method} ${route.url}`).toBe(403);
      expect(response.json().error.code, `${route.method} ${route.url}`).toBe('forbidden');
    }
  });

  it('студент на тех же запросах отказа по роли не получает', async () => {
    const roomsRoutes = t.routes.filter((route) => route.url.startsWith('/v1/rooms') && route.method !== 'HEAD');
    for (const route of roomsRoutes) {
      const response = await call(route.method, route.url, 'student');
      expect(response.statusCode, `${route.method} ${route.url}`).not.toBe(403);
    }
  });

  it('анонимная персона комнат создаётся только у студента и только при обращении к комнатам', async () => {
    const fresh = await createTestContext();
    const student = await fresh.registerAs('student', 'a@example.com');
    const teacher = await fresh.registerAs('teacher', 'b@example.com');
    expect(await fresh.db.select().from(personas)).toHaveLength(0);

    await fresh.app.inject({ method: 'GET', url: '/v1/rooms/me', headers: fresh.authed(teacher) });
    expect(await fresh.db.select().from(personas)).toHaveLength(0);

    await fresh.app.inject({ method: 'GET', url: '/v1/rooms/me', headers: fresh.authed(student) });
    await fresh.app.inject({ method: 'GET', url: '/v1/rooms/slots', headers: fresh.authed(student) });
    expect(await fresh.db.select().from(personas)).toHaveLength(1);
    await fresh.close();
  });

  it('если админ сменил роль, права меняются сразу, без повторного входа', async () => {
    const fresh = await createTestContext();
    const token = await fresh.registerAs('student', 'a@example.com');
    const rooms = () => fresh.app.inject({ method: 'GET', url: '/v1/rooms/slots', headers: fresh.authed(token) });
    expect((await rooms()).statusCode).toBe(200);

    await fresh.db.update(accounts).set({ role: 'guest' });
    expect((await rooms()).statusCode).toBe(403);
    await fresh.db.update(accounts).set({ role: 'student' }).where(eq(accounts.role, 'guest'));
    expect((await rooms()).statusCode).toBe(200);
    await fresh.close();
  });

  it('напоминания о комнатах приходят только студентам', async () => {
    const fresh = await createTestContext();
    const { runReminderTick } = await import('../modules/rooms/reminders/service');
    for (const role of ROLES) {
      const token = await fresh.registerAs(role, `${role}@example.com`);
      await fresh.app.inject({
        method: 'POST',
        url: '/v1/push/subscriptions',
        headers: fresh.authed(token),
        payload: { endpoint: `https://fcm.googleapis.com/fcm/send/${role}`, keys: { p256dh: 'k', auth: 'a' } },
      });
    }
    const now = new Date();
    await fresh.db.insert(slots).values({ title: 'Комната', startsAt: new Date(now.getTime() + 3 * 60_000), durationMinutes: 45, createdAt: now });
    await runReminderTick({ db: fresh.db, push: fresh.push, onError: () => undefined }, now);
    expect(fresh.push.sent.map((item) => item.endpoint)).toEqual(['https://fcm.googleapis.com/fcm/send/student']);
    await fresh.close();
  });
});
