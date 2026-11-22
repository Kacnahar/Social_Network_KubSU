import { ROLES, postsPageSchema, type Role } from '@app/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { posts } from '../../db/schema';
import { createTestContext, type TestContext } from '../../testing';

describe('лента', () => {
  let t: TestContext;
  const people = {} as Record<Role, { token: string; profileId: string }>;

  const feed = (token: string, before?: string) =>
    t.app.inject({ method: 'GET', url: `/v1/feed${before ? `?before=${encodeURIComponent(before)}` : ''}`, headers: t.authed(token) });

  beforeAll(async () => {
    t = await createTestContext();
    for (const role of ROLES) {
      const token = await t.registerAs(role, `${role}@example.com`);
      const saved = await t.app.inject({ method: 'PUT', url: '/v1/profile', headers: t.authed(token), payload: { displayName: `Имя ${role}` } });
      people[role] = { token, profileId: saved.json().profile.profileId };
    }
    const base = Date.now() - 60_000;
    await t.db.insert(posts).values(
      Array.from({ length: 45 }, (_, index) => ({
        authorProfileId: index % 2 === 0 ? people.student.profileId : people.teacher.profileId,
        text: `пост ${index + 1}`,
        createdAt: new Date(base + index * 1000),
      })),
    );
  });

  afterAll(async () => {
    await t.close();
  });

  it('показывает посты всех пользователей, новые сверху, порциями по 20', async () => {
    const first = postsPageSchema.parse((await feed(people.student.token)).json());
    expect(first.posts).toHaveLength(20);
    expect(first.posts.slice(0, 3).map((post) => post.text)).toEqual(['пост 45', 'пост 44', 'пост 43']);
    expect(new Set(first.posts.map((post) => post.author.role))).toEqual(new Set(['student', 'teacher']));

    const second = postsPageSchema.parse((await feed(people.student.token, first.nextCursor!)).json());
    const third = postsPageSchema.parse((await feed(people.student.token, second.nextCursor!)).json());
    expect(second.posts).toHaveLength(20);
    expect(third.posts.map((post) => post.text)).toEqual(['пост 5', 'пост 4', 'пост 3', 'пост 2', 'пост 1']);
    expect(third.nextCursor).toBeNull();

    const all = [...first.posts, ...second.posts, ...third.posts].map((post) => post.postId);
    expect(new Set(all).size).toBe(45);
  });

  it('видна всем ролям, в том числе гостю, и человеку без профиля', async () => {
    for (const role of ROLES) expect((await feed(people[role].token)).statusCode, role).toBe(200);
    const noProfile = await t.registerAs('guest', 'noprofile@example.com');
    expect((await feed(noProfile)).statusCode).toBe(200);
  });

  it('без входа недоступна; мусор вместо курсора — 400', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/v1/feed' })).statusCode).toBe(401);
    expect((await feed(people.student.token, 'мусор')).statusCode).toBe(400);
  });

  it('новый пост появляется сверху; «моё» отмечено только у автора; свой лайк виден только мне', async () => {
    const created = await t.app.inject({ method: 'POST', url: '/v1/posts', headers: t.authed(people.teacher.token), payload: { text: 'свежий' } });
    const postId = created.json().postId;
    await t.app.inject({ method: 'PUT', url: `/v1/posts/${postId}/like`, headers: t.authed(people.student.token) });

    const forStudent = (await feed(people.student.token)).json().posts[0];
    const forTeacher = (await feed(people.teacher.token)).json().posts[0];
    const forGuest = (await feed(people.guest.token)).json().posts[0];
    expect([forStudent.text, forStudent.likedByMe, forStudent.canDelete, forStudent.likeCount]).toEqual(['свежий', true, false, 1]);
    expect([forTeacher.likedByMe, forTeacher.canDelete]).toEqual([false, true]);
    expect([forGuest.likedByMe, forGuest.canDelete, forGuest.likeCount]).toEqual([false, false, 1]);
  });

  it('удалённый пост и посты удалённого аккаунта из ленты исчезают', async () => {
    const created = await t.app.inject({ method: 'POST', url: '/v1/posts', headers: t.authed(people.teacher.token), payload: { text: 'на удаление' } });
    await t.app.inject({ method: 'DELETE', url: `/v1/posts/${created.json().postId}`, headers: t.authed(people.teacher.token) });
    expect((await feed(people.guest.token)).json().posts.map((post: { text: string }) => post.text)).not.toContain('на удаление');

    await t.app.inject({ method: 'DELETE', url: '/v1/account', headers: t.authed(people.teacher.token) });
    const roles = (await feed(people.guest.token)).json().posts.map((post: { author: { role: string } }) => post.author.role);
    expect(new Set(roles)).toEqual(new Set(['student']));
  });
});
