import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { accounts, adminAuditLog, postReports, posts, roomSanctions, slots } from '../db/schema';
import { createTestContext, type TestContext } from '../testing';

const ADMIN_EMAIL = 'boss@example.com';
const SECOND_ADMIN_EMAIL = 'second.boss@example.com';
const AUTHOR_NAME = 'Автор Постов';
const REPORTER_NAME = 'Жалобщик Иванов';
const AUTHOR_NICK = 'Тихий_автор';

describe('админка', () => {
  let t: TestContext;
  let admin: { authorization: string };
  let secondAdmin: { authorization: string };
  let author: { authorization: string };
  let reporter: { authorization: string };
  let authorPersonaId: string;

  const call = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, headers?: { authorization: string }, payload?: object) =>
    t.app.inject({ method, url, ...(headers ? { headers } : {}), ...(payload ? { payload } : {}) });

  async function newPost(text: string): Promise<string> {
    return (await call('POST', '/v1/posts', author, { text })).json().postId;
  }

  async function newReportedPost(text: string): Promise<{ postId: string; reportId: string }> {
    const postId = await newPost(text);
    expect((await call('POST', `/v1/posts/${postId}/report`, reporter, { reason: 'оскорбления' })).statusCode).toBe(200);
    const list = (await call('GET', '/v1/admin/reports/posts', admin)).json().reports as { reportId: string; target: { text: string } | null }[];
    return { postId, reportId: list.find((item) => item.target?.text === text)!.reportId };
  }

  beforeAll(async () => {
    t = await createTestContext({ ADMIN_EMAILS: `${ADMIN_EMAIL}, ${SECOND_ADMIN_EMAIL}` });
    admin = t.authed(await t.register(ADMIN_EMAIL));
    secondAdmin = t.authed(await t.registerAs('teacher', SECOND_ADMIN_EMAIL));
    author = t.authed(await t.register('author@example.com'));
    reporter = t.authed(await t.register('reporter@example.com'));
    await call('PUT', '/v1/profile', author, { displayName: AUTHOR_NAME });
    await call('PUT', '/v1/profile', reporter, { displayName: REPORTER_NAME });
    await call('PUT', '/v1/rooms/me/nickname', author, { nickname: AUTHOR_NICK });
    await call('PUT', '/v1/rooms/me/nickname', reporter, { nickname: 'Жалобщик_комнат' });
    authorPersonaId = (await call('GET', '/v1/rooms/me', author)).json().personaId;
  });

  afterAll(async () => {
    await t.close();
  });

  it('пускает только тех, чья почта есть в настройках, и только после входа', async () => {
    const adminRoutes = t.routes.filter((route) => route.url.startsWith('/v1/admin') && route.method !== 'HEAD');
    expect(adminRoutes.length).toBeGreaterThanOrEqual(8);
    const guest = t.authed(await t.registerAs('guest', 'guest.admin@example.com'));
    const teacher = t.authed(await t.registerAs('teacher', 'teacher.admin@example.com'));

    for (const route of adminRoutes) {
      const url = route.url.replace(/:\w+/g, '00000000-0000-4000-8000-000000000000');
      const method = route.method as 'GET' | 'POST' | 'PUT' | 'DELETE';
      expect((await call(method, url)).statusCode, `${method} ${url} без входа`).toBe(401);
      for (const who of [author, teacher, guest]) {
        const response = await call(method, url, who, method === 'PUT' ? { days: 1 } : undefined);
        expect(response.statusCode, `${method} ${url}`).toBe(403);
        expect(response.json().error.code).toBe('forbidden');
      }
    }
  });

  it('в ответе об аккаунте админ помечен, остальные — нет', async () => {
    expect((await call('GET', '/v1/account', admin)).json().isAdmin).toBe(true);
    expect((await call('GET', '/v1/account', secondAdmin)).json().isAdmin).toBe(true);
    expect((await call('GET', '/v1/account', author)).json().isAdmin).toBe(false);
  });

  it('без настройки ADMIN_EMAILS админов нет вовсе', async () => {
    const plain = await createTestContext();
    try {
      const token = plain.authed(await plain.register(ADMIN_EMAIL));
      expect((await plain.app.inject({ method: 'GET', url: '/v1/admin/log', headers: token })).statusCode).toBe(403);
      expect((await plain.app.inject({ method: 'GET', url: '/v1/account', headers: token })).json().isAdmin).toBe(false);
    } finally {
      await plain.close();
    }
  });

  it('показывает жалобу на пост: кто пожаловался, на что и текст записи', async () => {
    const { reportId } = await newReportedPost('Плохой пост номер один');
    const report = (await call('GET', '/v1/admin/reports/posts', admin)).json().reports.find((item: { reportId: string }) => item.reportId === reportId);
    expect(report).toMatchObject({
      targetType: 'post',
      reason: 'оскорбления',
      status: 'new',
      resolution: null,
      reportsOnTarget: 1,
      reporter: { displayName: REPORTER_NAME },
      target: { text: 'Плохой пост номер один', author: { displayName: AUTHOR_NAME } },
    });
  });

  it('удаляет пост по жалобе: пост исчезает, все жалобы на него закрыты, действие в журнале', async () => {
    const { postId, reportId } = await newReportedPost('Пост на удаление');
    // Вторая жалоба на тот же пост — от самого админа как обычного пользователя
    await call('PUT', '/v1/profile', admin, { displayName: 'Админ как человек' });
    await call('POST', `/v1/posts/${postId}/report`, admin, { reason: 'тоже не нравится' });

    expect((await call('POST', `/v1/admin/reports/posts/${reportId}/remove`, admin)).statusCode).toBe(200);

    expect((await call('GET', `/v1/posts/${postId}`, author)).statusCode).toBe(404);
    expect(await t.db.select().from(posts).where(eq(posts.id, postId))).toHaveLength(0);
    const reports = await t.db.select().from(postReports).where(eq(postReports.targetId, postId));
    expect(reports).toHaveLength(2);
    for (const report of reports) expect(report).toMatchObject({ status: 'closed', resolution: 'removed' });

    const closed = (await call('GET', '/v1/admin/reports/posts?status=closed', admin)).json().reports;
    expect(closed.find((item: { reportId: string }) => item.reportId === reportId)).toMatchObject({ target: null, resolution: 'removed' });
    const log = (await call('GET', '/v1/admin/log', admin)).json().entries;
    expect(log[0]).toMatchObject({ action: 'post_removed', adminLabel: 'Админ 1', byMe: true });
  });

  it('удаляет фото поста вместе с постом', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const upload = await t.app.inject({ method: 'POST', url: '/v1/media?purpose=post', headers: { ...author, 'content-type': 'image/png' }, payload: png });
    expect(upload.statusCode).toBe(200);
    const postId = (await call('POST', '/v1/posts', author, { text: 'С фото', photoMediaIds: [upload.json().mediaId] })).json().postId;
    await call('POST', `/v1/posts/${postId}/report`, reporter, { reason: 'фото' });
    const report = (await call('GET', '/v1/admin/reports/posts', admin)).json().reports.find((item: { target: { text: string } | null }) => item.target?.text === 'С фото');
    expect(report.target.photos).toHaveLength(1);
    const before = t.media.files.size;

    await call('POST', `/v1/admin/reports/posts/${report.reportId}/remove`, admin);
    expect(t.media.files.size).toBe(before - 1);
  });

  it('удаляет комментарий по жалобе, пост остаётся', async () => {
    const postId = await newPost('Пост с комментарием');
    const commentId = (await call('POST', `/v1/posts/${postId}/comments`, author, { text: 'Грубый комментарий' })).json().commentId;
    await call('POST', `/v1/posts/comments/${commentId}/report`, reporter, { reason: 'грубость' });
    const report = (await call('GET', '/v1/admin/reports/posts', admin)).json().reports.find((item: { targetType: string }) => item.targetType === 'comment');
    expect(report.target.text).toBe('Грубый комментарий');

    expect((await call('POST', `/v1/admin/reports/posts/${report.reportId}/remove`, admin)).statusCode).toBe(200);
    expect((await call('GET', `/v1/posts/${postId}/comments`, author)).json().comments).toHaveLength(0);
    expect((await call('GET', `/v1/posts/${postId}`, author)).statusCode).toBe(200);
    expect((await call('GET', '/v1/admin/log', admin)).json().entries[0].action).toBe('comment_removed');
  });

  it('отклоняет жалобу: запись остаётся, жалоба закрыта; повтор ничего не меняет', async () => {
    const { postId, reportId } = await newReportedPost('Нормальный пост');
    expect((await call('POST', `/v1/admin/reports/posts/${reportId}/dismiss`, secondAdmin)).statusCode).toBe(200);
    expect((await call('POST', `/v1/admin/reports/posts/${reportId}/dismiss`, secondAdmin)).statusCode).toBe(200);

    expect((await call('GET', `/v1/posts/${postId}`, author)).statusCode).toBe(200);
    const [row] = await t.db.select().from(postReports).where(eq(postReports.id, reportId));
    expect(row).toMatchObject({ status: 'closed', resolution: 'dismissed' });
    const entries = (await call('GET', '/v1/admin/log', admin)).json().entries.filter((entry: { action: string }) => entry.action === 'post_report_dismissed');
    expect(entries).toHaveLength(1);
    // Журнал показывает, какой из админов действовал, не раскрывая, кто он
    expect(entries[0]).toMatchObject({ adminLabel: 'Админ 2', byMe: false });
  });

  it('если автор сам удалил запись, жалоба закрывается без записи «удалено админом» в журнале', async () => {
    const { postId, reportId } = await newReportedPost('Автор удалит сам');
    await call('DELETE', `/v1/posts/${postId}`, author);
    const before = (await t.db.select().from(adminAuditLog)).length;
    expect((await call('POST', `/v1/admin/reports/posts/${reportId}/remove`, admin)).statusCode).toBe(200);
    expect((await t.db.select().from(adminAuditLog)).length).toBe(before);
  });

  it('несуществующая жалоба — 404, кривой идентификатор — 400', async () => {
    expect((await call('POST', '/v1/admin/reports/posts/00000000-0000-4000-8000-000000000000/remove', admin)).statusCode).toBe(404);
    expect((await call('POST', '/v1/admin/reports/rooms/00000000-0000-4000-8000-000000000000/close', admin)).statusCode).toBe(404);
    expect((await call('POST', '/v1/admin/reports/posts/nope/dismiss', admin)).statusCode).toBe(400);
    expect((await call('GET', '/v1/admin/reports/posts?status=всякое', admin)).statusCode).toBe(400);
  });

  describe('жалобы из комнат', () => {
    let reportId: string;

    beforeAll(async () => {
      await call('POST', '/v1/rooms/reports', reporter, { targetPersonaId: authorPersonaId, text: 'кричит в микрофон' });
      reportId = (await call('GET', '/v1/admin/reports/rooms', admin)).json().reports[0].reportId;
    });

    it('показывает жалобу с никами', async () => {
      const [report] = (await call('GET', '/v1/admin/reports/rooms', admin)).json().reports;
      expect(report).toMatchObject({
        text: 'кричит в микрофон',
        status: 'new',
        reporter: { nickname: 'Жалобщик_комнат' },
        target: { personaId: authorPersonaId, nickname: AUTHOR_NICK, blockedUntil: null },
      });
    });

    it('закрывает человеку вход в комнаты: сервер не пускает, а из идущей комнаты отключает', async () => {
      const [slot] = await t.db
        .insert(slots)
        .values({ title: 'Комната', startsAt: new Date(Date.now() - 60_000), durationMinutes: 45, createdAt: new Date() })
        .returning();
      const joined = await call('POST', `/v1/rooms/slots/${slot!.id}/join`, author);
      expect(joined.statusCode).toBe(200);

      expect((await call('PUT', `/v1/admin/rooms/personas/${authorPersonaId}/ban`, admin, { days: 3 })).statusCode).toBe(200);

      expect(t.voice.removed).toContainEqual(expect.objectContaining({ identity: authorPersonaId }));
      const again = await call('POST', `/v1/rooms/slots/${slot!.id}/join`, author);
      expect(again.statusCode).toBe(403);
      expect(again.json().error.code).toBe('room_blocked');
      const [report] = (await call('GET', '/v1/admin/reports/rooms', admin)).json().reports;
      expect(new Date(report.target.blockedUntil).getTime()).toBeGreaterThan(Date.now() + 2.9 * 24 * 60 * 60 * 1000);
      const [sanction] = await t.db.select().from(roomSanctions).where(eq(roomSanctions.personaId, authorPersonaId));
      expect(sanction).toMatchObject({ type: 'rooms_ban', source: 'admin' });
      expect((await call('GET', '/v1/admin/log', admin)).json().entries[0]).toMatchObject({ action: 'rooms_ban_set', note: 'на 3 дн.' });

      // Соцсеть при этом работает: блокировка касается только комнат
      expect((await call('POST', '/v1/posts', author, { text: 'Пост забаненного в комнатах' })).statusCode).toBe(200);
    });

    it('срок блокировки — от 1 до 30 дней', async () => {
      for (const days of [0, 31, 1.5]) {
        expect((await call('PUT', `/v1/admin/rooms/personas/${authorPersonaId}/ban`, admin, { days })).statusCode).toBe(400);
      }
      expect((await call('PUT', '/v1/admin/rooms/personas/00000000-0000-4000-8000-000000000000/ban', admin, { days: 1 })).statusCode).toBe(404);
    });

    it('снимает блокировку: человек снова может войти', async () => {
      expect((await call('DELETE', `/v1/admin/rooms/personas/${authorPersonaId}/ban`, admin)).statusCode).toBe(200);
      const [slot] = await t.db.select().from(slots);
      expect((await call('POST', `/v1/rooms/slots/${slot!.id}/join`, author)).statusCode).toBe(200);
      expect((await call('GET', '/v1/admin/log', admin)).json().entries[0].action).toBe('rooms_ban_lifted');
      // Снимать нечего — в журнал ничего не пишется
      const before = (await t.db.select().from(adminAuditLog)).length;
      await call('DELETE', `/v1/admin/rooms/personas/${authorPersonaId}/ban`, admin);
      expect((await t.db.select().from(adminAuditLog)).length).toBe(before);
    });

    it('закрывает жалобу', async () => {
      expect((await call('POST', `/v1/admin/reports/rooms/${reportId}/close`, admin)).statusCode).toBe(200);
      expect((await call('GET', '/v1/admin/reports/rooms', admin)).json().reports).toHaveLength(0);
      expect((await call('GET', '/v1/admin/reports/rooms?status=closed', admin)).json().reports).toHaveLength(1);
    });
  });

  it('ответы админки не раскрывают почту и аккаунт и не сводят профиль с ником комнат', async () => {
    const all = await t.db.select().from(accounts);
    const adminResponses = t.responses.filter((item) => item.url.startsWith('/v1/admin') && item.body.length > 0);
    expect(adminResponses.some((item) => item.body.includes(AUTHOR_NAME))).toBe(true);
    expect(adminResponses.some((item) => item.body.includes(AUTHOR_NICK))).toBe(true);

    for (const { url, body } of adminResponses) {
      expect(body, url).not.toMatch(/account_?id|email/i);
      for (const account of all) {
        expect(body, url).not.toContain(account.id);
        expect(body, url).not.toContain(account.emailHash);
      }
      for (const email of [ADMIN_EMAIL, SECOND_ADMIN_EMAIL, 'author@example.com']) expect(body, url).not.toContain(email);
      const hasProfile = ['profileId', 'displayName', AUTHOR_NAME, REPORTER_NAME].some((mark) => body.includes(mark));
      const hasPersona = ['personaId', 'nickname', AUTHOR_NICK, authorPersonaId].some((mark) => body.includes(mark));
      expect(hasProfile && hasPersona, `ответ ${url} содержит и профиль, и персону комнат`).toBe(false);
    }
  });
});
