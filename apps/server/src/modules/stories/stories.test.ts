import { storiesResponseSchema, storyViewersResponseSchema, type Role } from '@app/shared';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mediaFiles, stories, storyViews } from '../../db/schema';
import { purgeUnusedMedia, runMaintenance } from '../../maintenance';
import { createTestContext, type TestContext } from '../../testing';

const HOUR = 60 * 60 * 1000;
const SOME_ID = '00000000-0000-4000-8000-000000000000';
const NOW = new Date('2026-11-23T10:00:00.000Z');
const photo = () => sharp({ create: { width: 720, height: 1280, channels: 3, background: { r: 200, g: 60, b: 90 } } }).jpeg().toBuffer();

describe('истории', () => {
  let t: TestContext;
  let anya: { token: string; profileId: string };
  let boris: { token: string; profileId: string };
  let guest: { token: string; profileId: string };

  const member = async (role: Role, email: string, displayName: string) => {
    const token = await t.registerAs(role, email);
    const saved = await t.app.inject({ method: 'PUT', url: '/v1/profile', headers: t.authed(token), payload: { displayName } });
    return { token, profileId: saved.json().profile.profileId as string };
  };
  const call = (method: string, url: string, token: string, payload?: unknown) =>
    t.app.inject({ method: method as 'GET', url, headers: t.authed(token), ...(payload === undefined ? {} : { payload: payload as object }) });
  const upload = async (token: string, purpose = 'story') =>
    (
      await t.app.inject({
        method: 'POST',
        url: `/v1/media?purpose=${purpose}`,
        headers: { ...t.authed(token), 'content-type': 'image/jpeg' },
        payload: await photo(),
      })
    ).json().mediaId as string;
  const publish = async (token: string, caption = '') => call('POST', '/v1/stories', token, { mediaId: await upload(token), caption });
  const list = async (token: string) => storiesResponseSchema.parse((await call('GET', '/v1/stories', token)).json()).groups;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    t = await createTestContext();
    anya = await member('student', 'anya@example.com', 'Аня');
    boris = await member('teacher', 'boris@example.com', 'Борис');
    guest = await member('guest', 'guest@example.com', 'Гость');
  });

  afterEach(async () => {
    await t.close();
    vi.useRealTimers();
  });

  it('история с фото и подписью видна всем и собрана в кружок автора', async () => {
    expect((await publish(anya.token, '  Утро в парке  ')).statusCode).toBe(200);
    const [group] = await list(guest.token);
    expect(group).toMatchObject({ author: { profileId: anya.profileId, displayName: 'Аня' }, isMine: false, hasUnseen: true });
    expect(group!.stories).toHaveLength(1);
    expect(group!.stories[0]).toMatchObject({
      caption: 'Утро в парке',
      viewedByMe: false,
      viewCount: null,
      canDelete: false,
      photo: { width: 720, height: 1280 },
      expiresAt: new Date(NOW.getTime() + 24 * HOUR).toISOString(),
    });
    expect((await t.app.inject({ method: 'GET', url: group!.stories[0]!.photo.url })).statusCode).toBe(200);
  });

  it('пропадает ровно через 24 часа — из списка, просмотра и списка посмотревших', async () => {
    await publish(anya.token);
    const storyId = (await list(anya.token))[0]!.stories[0]!.storyId;

    vi.setSystemTime(NOW.getTime() + 24 * HOUR - 1000);
    expect(await list(boris.token)).toHaveLength(1);
    expect((await call('POST', `/v1/stories/${storyId}/view`, boris.token)).statusCode).toBe(200);

    vi.setSystemTime(NOW.getTime() + 24 * HOUR);
    expect(await list(boris.token)).toEqual([]);
    expect(await list(anya.token)).toEqual([]);
    expect((await call('POST', `/v1/stories/${storyId}/view`, guest.token)).statusCode).toBe(404);
    expect((await call('GET', `/v1/stories/${storyId}/viewers`, anya.token)).statusCode).toBe(404);
    expect((await call('DELETE', `/v1/stories/${storyId}`, anya.token)).statusCode).toBe(404);
  });

  it('фоновая уборка стирает просроченную историю вместе с файлом, а свежую не трогает', async () => {
    await publish(anya.token, 'старая');
    vi.setSystemTime(NOW.getTime() + 20 * HOUR);
    await publish(boris.token, 'свежая');
    expect(t.media.files.size).toBe(2);

    vi.setSystemTime(NOW.getTime() + 25 * HOUR);
    await runMaintenance({ db: t.db, media: t.media }, new Date());
    expect((await t.db.select().from(stories)).map((row) => row.caption)).toEqual(['свежая']);
    expect(t.media.files.size).toBe(1);
    expect(await t.db.select().from(mediaFiles)).toHaveLength(1);
  });

  it('автор видит, кто посмотрел, и сколько; остальные — нет; свои просмотры не считаются', async () => {
    await publish(anya.token);
    const storyId = (await list(anya.token))[0]!.stories[0]!.storyId;
    await call('POST', `/v1/stories/${storyId}/view`, anya.token);
    await call('POST', `/v1/stories/${storyId}/view`, boris.token);
    await call('POST', `/v1/stories/${storyId}/view`, boris.token);
    vi.setSystemTime(NOW.getTime() + 60_000);
    await call('POST', `/v1/stories/${storyId}/view`, guest.token);

    const viewers = storyViewersResponseSchema.parse((await call('GET', `/v1/stories/${storyId}/viewers`, anya.token)).json()).viewers;
    expect(viewers.map((item) => item.viewer.displayName)).toEqual(['Гость', 'Борис']);

    const denied = await call('GET', `/v1/stories/${storyId}/viewers`, boris.token);
    expect(denied.statusCode).toBe(403);

    const mine = (await list(anya.token))[0]!;
    expect([mine.isMine, mine.hasUnseen, mine.stories[0]!.viewCount, mine.stories[0]!.canDelete]).toEqual([true, false, 2, true]);
    const forBoris = (await list(boris.token))[0]!;
    expect([forBoris.hasUnseen, forBoris.stories[0]!.viewedByMe, forBoris.stories[0]!.viewCount]).toEqual([false, true, null]);
  });

  it('кружки идут так: свои, потом с непросмотренными, потом просмотренные; внутри — от старых к новым', async () => {
    await publish(boris.token, 'б1');
    vi.setSystemTime(NOW.getTime() + 60_000);
    await publish(anya.token, 'а1');
    vi.setSystemTime(NOW.getTime() + 120_000);
    await publish(boris.token, 'б2');
    const carol = await member('student', 'carol@example.com', 'Вера');
    vi.setSystemTime(NOW.getTime() + 180_000);
    await publish(carol.token, 'в1');

    const before = await list(anya.token);
    expect(before.map((group) => group.author.displayName)).toEqual(['Аня', 'Вера', 'Борис']);
    expect(before[2]!.stories.map((story) => story.caption)).toEqual(['б1', 'б2']);

    for (const story of before[1]!.stories) await call('POST', `/v1/stories/${story.storyId}/view`, anya.token);
    const after = await list(anya.token);
    expect(after.map((group) => [group.author.displayName, group.hasUnseen])).toEqual([
      ['Аня', false],
      ['Борис', true],
      ['Вера', false],
    ]);
  });

  it('гость смотрит и отмечает просмотр, но публиковать и удалять не может', async () => {
    await publish(anya.token);
    const storyId = (await list(guest.token))[0]!.stories[0]!.storyId;
    expect((await call('POST', `/v1/stories/${storyId}/view`, guest.token)).statusCode).toBe(200);

    const changing = t.routes.filter(
      (route) => route.url.startsWith('/v1/stories') && !['GET', 'HEAD'].includes(route.method) && !route.url.endsWith('/view'),
    );
    expect(changing.length).toBeGreaterThanOrEqual(2);
    for (const route of changing) {
      const response = await call(route.method, route.url.replace(':storyId', storyId), guest.token, route.method === 'DELETE' ? undefined : { mediaId: SOME_ID });
      expect(response.statusCode, `${route.method} ${route.url}`).toBe(403);
      expect(response.json().error.code).toBe('forbidden');
    }
    expect(await t.db.select().from(stories)).toHaveLength(1);
  });

  it('прикрепить можно только своё фото, загруженное для истории и не использованное', async () => {
    const foreign = await upload(boris.token);
    const forPost = await upload(anya.token, 'post');
    const used = await upload(anya.token);
    await call('POST', '/v1/stories', anya.token, { mediaId: used });
    for (const mediaId of [foreign, forPost, used, SOME_ID]) {
      expect((await call('POST', '/v1/stories', anya.token, { mediaId })).statusCode, mediaId).toBe(400);
    }
    expect((await call('POST', '/v1/stories', anya.token, { mediaId: await upload(anya.token), caption: 'а'.repeat(201) })).statusCode).toBe(400);
    expect((await call('POST', '/v1/stories', anya.token, {})).statusCode).toBe(400);
  });

  it('без входа и без профиля: смотреть список можно только вошедшему, отмечать просмотр — только с профилем', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/v1/stories' })).statusCode).toBe(401);
    await publish(anya.token);
    const noProfile = await t.registerAs('student', 'noprofile@example.com');
    const groups = await list(noProfile);
    expect(groups).toHaveLength(1);
    const response = await call('POST', `/v1/stories/${groups[0]!.stories[0]!.storyId}/view`, noProfile);
    expect(response.json().error.code).toBe('profile_required');
  });

  it('удалить может только автор; файл стирается', async () => {
    await publish(anya.token);
    const storyId = (await list(anya.token))[0]!.stories[0]!.storyId;
    await call('POST', `/v1/stories/${storyId}/view`, boris.token);
    expect((await call('DELETE', `/v1/stories/${storyId}`, boris.token)).statusCode).toBe(403);
    expect((await call('DELETE', `/v1/stories/${storyId}`, anya.token)).statusCode).toBe(200);
    expect(await list(boris.token)).toEqual([]);
    expect(t.media.files.size).toBe(0);
    expect(await t.db.select().from(storyViews)).toHaveLength(0);
    expect((await call('DELETE', `/v1/stories/${SOME_ID}`, anya.token)).statusCode).toBe(404);
  });

  it('удаление аккаунта стирает его истории, файлы и его просмотры чужих историй', async () => {
    await publish(anya.token);
    await publish(boris.token);
    const borisStory = (await list(anya.token)).find((group) => !group.isMine)!.stories[0]!.storyId;
    await call('POST', `/v1/stories/${borisStory}/view`, anya.token);

    await call('DELETE', '/v1/account', anya.token);
    expect((await list(boris.token)).map((group) => group.author.displayName)).toEqual(['Борис']);
    expect(await t.db.select().from(storyViews)).toHaveLength(0);
    expect(t.media.files.size).toBe(1);
  });

  it('загруженные и нигде не использованные фото удаляются через сутки, использованные — нет', async () => {
    const avatar = await upload(anya.token, 'avatar');
    await call('PUT', '/v1/profile', anya.token, { displayName: 'Аня', avatarMediaId: avatar });
    const inPost = await upload(anya.token, 'post');
    await call('POST', '/v1/posts', anya.token, { photoMediaIds: [inPost] });
    await upload(anya.token, 'post');
    await upload(anya.token, 'avatar');
    expect(t.media.files.size).toBe(4);

    expect(await purgeUnusedMedia({ db: t.db, media: t.media }, new Date(NOW.getTime() + 23 * HOUR))).toBe(0);
    expect(await purgeUnusedMedia({ db: t.db, media: t.media }, new Date(NOW.getTime() + 25 * HOUR))).toBe(2);
    expect([...t.media.files.keys()].sort()).toEqual([`${avatar}.jpg`, `${inPost}.jpg`].sort());
  });
});
