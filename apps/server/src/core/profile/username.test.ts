import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from '../../testing';

describe('никнейм и дополнительные поля профиля', () => {
  let t: TestContext;
  let anya: string;
  let boris: string;
  let teacher: string;

  beforeAll(async () => {
    t = await createTestContext();
    anya = await t.registerAs('student', 'anya@example.com');
    boris = await t.registerAs('student', 'boris@example.com');
    teacher = await t.registerAs('teacher', 'teacher@example.com');
  });

  afterAll(async () => {
    await t.close();
  });

  const save = (payload: Record<string, unknown>, as: string) =>
    t.app.inject({ method: 'PUT', url: '/v1/profile', headers: t.authed(as), payload });
  const available = (username: string, as: string) =>
    t.app.inject({ method: 'GET', url: `/v1/profile/username-available?username=${encodeURIComponent(username)}`, headers: t.authed(as) });
  const view = (profileId: string, as: string) =>
    t.app.inject({ method: 'GET', url: `/v1/profiles/${profileId}`, headers: t.authed(as) });

  it('никнейм сохраняется строчными, без @, и виден другим', async () => {
    const saved = await save({ displayName: 'Аня', username: '@Anya.P_01' }, anya);
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json().profile.username).toBe('anya.p_01');
    const profileId = saved.json().profile.profileId;
    expect((await view(profileId, boris)).json().username).toBe('anya.p_01');
  });

  it('занятый никнейм другому не даётся, себе — свободен', async () => {
    expect((await available('anya.p_01', boris)).json()).toEqual({ available: false });
    expect((await available('ANYA.P_01', boris)).json()).toEqual({ available: false });
    expect((await available('anya.p_01', anya)).json()).toEqual({ available: true });
    expect((await available('boris', boris)).json()).toEqual({ available: true });

    const taken = await save({ displayName: 'Боря', username: 'anya.p_01' }, boris);
    expect(taken.statusCode).toBe(409);
    expect(taken.json().error.code).toBe('username_taken');
  });

  it('служебные и неправильные никнеймы', async () => {
    expect((await available('admin', boris)).json()).toEqual({ available: false });
    expect((await save({ displayName: 'Боря', username: 'support' }, boris)).statusCode).toBe(409);
    for (const bad of ['ab', 'a'.repeat(21), 'иван', 'ivan petrov', 'ivan-p']) {
      expect((await available(bad, boris)).statusCode, bad).toBe(400);
      expect((await save({ displayName: 'Боря', username: bad }, boris)).statusCode, bad).toBe(400);
    }
    expect((await available('x', '')).statusCode).toBe(401);
  });

  it('не переданный никнейм не меняется; null — убирает и освобождает', async () => {
    expect((await save({ displayName: 'Аня' }, anya)).json().profile.username).toBe('anya.p_01');
    expect((await save({ displayName: 'Аня', username: null }, anya)).json().profile.username).toBeNull();
    expect((await save({ displayName: 'Боря', username: 'anya.p_01' }, boris)).statusCode).toBe(200);
  });

  it('ссылки: до трёх, только http(s)', async () => {
    const links = ['https://t.me/anya', 'https://vk.com/anya', 'http://example.com/'];
    expect((await save({ displayName: 'Аня', links }, anya)).json().profile.links).toEqual(links);
    expect((await save({ displayName: 'Аня', links: [...links, 'https://github.com/a'] }, anya)).statusCode).toBe(400);
    expect((await save({ displayName: 'Аня', links: ['javascript:alert(1)'] }, anya)).statusCode).toBe(400);
    expect((await save({ displayName: 'Аня', links: ['просто текст'] }, anya)).statusCode).toBe(400);
  });

  it('«что видно в профиле»: скрытое не отдаётся другим, но видно себе', async () => {
    const saved = await save({ displayName: 'Аня', faculty: 'ФКТиПМ', course: 2, birthDate: '2005-03-14' }, anya);
    const profileId = saved.json().profile.profileId;
    expect(saved.json().privacy).toEqual({ showFaculty: true, showBirth: false, showFriends: true, showOnline: true });

    // По умолчанию дата рождения скрыта, факультет виден
    expect((await view(profileId, boris)).json()).toMatchObject({ faculty: 'ФКТиПМ', course: 2, birthDate: null });
    expect((await view(profileId, anya)).json().birthDate).toBe('2005-03-14');

    const changed = await save({ displayName: 'Аня', privacy: { showFaculty: false, showBirth: true } }, anya);
    expect(changed.json().privacy).toEqual({ showFaculty: false, showBirth: true, showFriends: true, showOnline: true });
    expect(changed.json().profile).toMatchObject({ faculty: 'ФКТиПМ', course: 2 });
    expect((await view(profileId, boris)).json()).toMatchObject({ faculty: null, course: null, birthDate: '2005-03-14' });
  });

  it('дата рождения: не из будущего и не младше 14 лет', async () => {
    expect((await save({ displayName: 'Аня', birthDate: '2999-01-01' }, anya)).statusCode).toBe(400);
    expect((await save({ displayName: 'Аня', birthDate: `${new Date().getFullYear() - 5}-01-01` }, anya)).statusCode).toBe(400);
    expect((await save({ displayName: 'Аня', birthDate: 'вчера' }, anya)).statusCode).toBe(400);
  });

  it('кафедра есть только у преподавателя', async () => {
    expect((await save({ displayName: 'Елена Викторовна', department: 'Кафедра алгебры' }, teacher)).json().profile.department).toBe('Кафедра алгебры');
    expect((await save({ displayName: 'Аня', department: 'Кафедра алгебры' }, anya)).json().profile.department).toBeNull();
  });
});
