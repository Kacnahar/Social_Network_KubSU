import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accounts, pushSubscriptions, slots } from '../../../db/schema';
import { isAllowedPushEndpoint } from '../../../core/push/service';
import { createTestContext, type TestContext } from '../../../testing';
import { runReminderTick } from './service';

const MINUTE = 60 * 1000;
const NOW = new Date('2026-11-23T15:00:00.000Z');
const START = new Date('2026-11-23T17:00:00.000Z');
const endpoint = (name: string) => `https://fcm.googleapis.com/fcm/send/${name}`;
const keys = { p256dh: 'p256dh-key', auth: 'auth-key' };

describe('напоминания', () => {
  let t: TestContext;
  let token: string;
  const errors: unknown[] = [];

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    errors.length = 0;
    t = await createTestContext();
    token = await t.register('student@example.com');
  });

  afterEach(async () => {
    await t.close();
    vi.useRealTimers();
  });

  const subscribe = (name: string, as: string = token) =>
    t.app.inject({
      method: 'POST',
      url: '/v1/push/subscriptions',
      headers: t.authed(as),
      payload: { endpoint: endpoint(name), keys },
    });
  const unsubscribe = (name: string, as: string = token) =>
    t.app.inject({
      method: 'DELETE',
      url: '/v1/push/subscriptions',
      headers: t.authed(as),
      payload: { endpoint: endpoint(name) },
    });
  const addSlot = (startsAt: Date = START, extra: Partial<typeof slots.$inferInsert> = {}) =>
    t.db.insert(slots).values({ title: 'Вечерняя комната', startsAt, durationMinutes: 45, createdAt: NOW, ...extra });
  const tickAt = async (minutesBeforeStart: number) => {
    vi.setSystemTime(START.getTime() - minutesBeforeStart * MINUTE);
    await runReminderTick({ db: t.db, push: t.push, onError: (error) => errors.push(error) }, new Date());
  };
  const bodies = () => t.push.sent.map((item) => item.message.body);

  describe('подписка', () => {
    it('сохраняется и удаляется', async () => {
      expect((await subscribe('a')).statusCode).toBe(200);
      expect(await t.db.select().from(pushSubscriptions)).toHaveLength(1);
      expect((await unsubscribe('a')).statusCode).toBe(200);
      expect(await t.db.select().from(pushSubscriptions)).toHaveLength(0);
    });

    it('требует входа', async () => {
      const response = await t.app.inject({
        method: 'POST',
        url: '/v1/push/subscriptions',
        payload: { endpoint: endpoint('a'), keys },
      });
      expect(response.statusCode).toBe(401);
    });

    it('повторная подписка того же браузера не создаёт дубль', async () => {
      await subscribe('a');
      await subscribe('a');
      expect(await t.db.select().from(pushSubscriptions)).toHaveLength(1);
    });

    it('если в браузере вошёл другой человек, подписка переходит к нему', async () => {
      await subscribe('a');
      const other = await t.register('other@example.com');
      await subscribe('a', other);
      await t.app.inject({ method: 'DELETE', url: '/v1/account', headers: t.authed(token) });
      expect(await t.db.select().from(pushSubscriptions)).toHaveLength(1);
    });

    it('нельзя удалить чужую подписку', async () => {
      await subscribe('a');
      const other = await t.register('other@example.com');
      await unsubscribe('a', other);
      expect(await t.db.select().from(pushSubscriptions)).toHaveLength(1);
    });

    it('удаляется вместе с аккаунтом', async () => {
      await subscribe('a');
      await t.app.inject({ method: 'DELETE', url: '/v1/account', headers: t.authed(token) });
      expect(await t.db.select().from(pushSubscriptions)).toHaveLength(0);
    });

    it.each([
      'https://evil.example/hook',
      'http://fcm.googleapis.com/fcm/send/a',
      'https://fcm.googleapis.com.evil.example/a',
      'https://localhost/a',
      'https://169.254.169.254/latest/meta-data',
      'https://fcm.googleapis.com:8443/a',
      'https://user@fcm.googleapis.com/a',
    ])('не принимает адрес, который не ведёт на push-сервис браузера: %s', async (badEndpoint) => {
      const response = await t.app.inject({
        method: 'POST',
        url: '/v1/push/subscriptions',
        headers: t.authed(token),
        payload: { endpoint: badEndpoint, keys },
      });
      expect(response.statusCode).toBe(400);
      expect(await t.db.select().from(pushSubscriptions)).toHaveLength(0);
    });

    it('принимает адреса push-сервисов Chrome, Firefox, Safari и Edge', () => {
      for (const good of [
        'https://fcm.googleapis.com/fcm/send/abc',
        'https://updates.push.services.mozilla.com/wpush/v2/abc',
        'https://web.push.apple.com/abc',
        'https://wns2-par02p.notify.windows.com/w/?token=abc',
      ]) {
        expect(isAllowedPushEndpoint(good), good).toBe(true);
      }
    });

    it('GET /v1/push/config отдаёт открытый ключ без входа', async () => {
      const response = await t.app.inject({ method: 'GET', url: '/v1/push/config' });
      expect(response.json()).toEqual({ vapidPublicKey: t.push.publicKey });
    });
  });

  describe('рассылка', () => {
    beforeEach(async () => {
      await subscribe('a');
      await addSlot();
    });

    it('за час и за 5 минут приходит по одному напоминанию', async () => {
      for (const minutes of [61, 60, 59.5, 59, 30, 6, 5, 4.5, 4, 1]) await tickAt(minutes);
      expect(bodies()).toEqual(['Комната начнётся через час', 'Комната начнётся через 5 минут']);
    });

    it('в уведомлении только название комнаты, время и ссылка на главный экран', async () => {
      await tickAt(60);
      expect(t.push.sent[0]?.message).toEqual({ title: 'Вечерняя комната', body: 'Комната начнётся через час', url: '/' });
    });

    it('уведомление перестаёт доставляться, когда комната началась', async () => {
      await tickAt(60);
      await tickAt(5);
      expect(t.push.sent.map((item) => item.ttlSeconds)).toEqual([3600, 300]);
    });

    it('раньше чем за час и после начала ничего не шлёт', async () => {
      await tickAt(90);
      await tickAt(0);
      await tickAt(-10);
      expect(bodies()).toEqual([]);
    });

    it('если сервер проспал «за час», запоздалое «через час» не шлёт, а «через 5 минут» шлёт', async () => {
      await tickAt(20);
      expect(bodies()).toEqual([]);
      await tickAt(3);
      expect(bodies()).toEqual(['Комната начнётся через 5 минут']);
    });

    it('по отменённой комнате не напоминает', async () => {
      await t.db.update(slots).set({ status: 'cancelled' });
      await tickAt(60);
      await tickAt(5);
      expect(bodies()).toEqual([]);
    });

    it('шлёт на все устройства всех подписанных', async () => {
      const other = await t.register('other@example.com');
      await subscribe('b', other);
      await subscribe('c', other);
      await tickAt(60);
      expect(t.push.sent.map((item) => item.endpoint).sort()).toEqual([endpoint('a'), endpoint('b'), endpoint('c')]);
    });

    it('после отписки не шлёт', async () => {
      await unsubscribe('a');
      await tickAt(60);
      expect(bodies()).toEqual([]);
    });

    it('забаненному не шлёт, а после окончания бана — снова шлёт', async () => {
      await t.db.update(accounts).set({ status: 'banned', bannedUntil: new Date(START.getTime() - 30 * MINUTE) });
      await tickAt(60);
      expect(bodies()).toEqual([]);
      await tickAt(5);
      expect(bodies()).toEqual(['Комната начнётся через 5 минут']);
    });

    it('удаляет подписки, которых больше нет в браузере', async () => {
      await subscribe('dead');
      t.push.goneEndpoints.add(endpoint('dead'));
      await tickAt(60);
      const left = await t.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint('dead')));
      expect(left).toHaveLength(0);
      expect(t.push.sent.map((item) => item.endpoint)).toEqual([endpoint('a')]);
    });

    it('сбой у одного получателя не мешает остальным и не теряет его подписку', async () => {
      await subscribe('broken');
      t.push.brokenEndpoints.add(endpoint('broken'));
      await tickAt(60);
      expect(t.push.sent.map((item) => item.endpoint)).toEqual([endpoint('a')]);
      expect(errors).toHaveLength(1);
      expect(await t.db.select().from(pushSubscriptions)).toHaveLength(2);
    });

    it('две комнаты подряд получают свои напоминания независимо', async () => {
      await addSlot(new Date(START.getTime() + 55 * MINUTE), { title: 'Вторая комната' });
      await tickAt(5);
      expect(t.push.sent.map((item) => `${item.message.title}: ${item.message.body}`).sort()).toEqual([
        'Вечерняя комната: Комната начнётся через 5 минут',
        'Вторая комната: Комната начнётся через час',
      ]);
    });
  });
});

describe('напоминания выключены на сервере', () => {
  it('config отдаёт null, а подписка отвечает понятной ошибкой', async () => {
    const { buildApp } = await import('../../../app');
    const t = await createTestContext();
    const token = await t.register('student@example.com');
    const app = await buildApp({ config: t.config, db: t.db, mailer: t.mailer, push: null, voice: null });

    expect((await app.inject({ method: 'GET', url: '/v1/push/config' })).json()).toEqual({ vapidPublicKey: null });
    const response = await app.inject({
      method: 'POST',
      url: '/v1/push/subscriptions',
      headers: t.authed(token),
      payload: { endpoint: endpoint('a'), keys },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('push_unavailable');
    await app.close();
    await t.close();
  });
});
