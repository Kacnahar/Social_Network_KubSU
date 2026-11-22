import { myProfileResponseSchema, profileSchema } from '@app/shared';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mediaFiles, profiles } from '../../db/schema';
import { createTestContext, type TestContext } from '../../testing';

const photo = (width = 800, height = 600) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } })
    .jpeg()
    .withExif({ IFD0: { Copyright: 'секрет' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '45/1 2/1 3/1' } })
    .toBuffer();

describe('профиль и фото', () => {
  let t: TestContext;
  let token: string;

  beforeEach(async () => {
    t = await createTestContext();
    token = await t.registerAs('student', 'student@example.com');
  });

  afterEach(async () => {
    await t.close();
  });

  const getMine = (as: string = token) => t.app.inject({ method: 'GET', url: '/v1/profile', headers: t.authed(as) });
  const save = (payload: Record<string, unknown>, as: string = token) =>
    t.app.inject({ method: 'PUT', url: '/v1/profile', headers: t.authed(as), payload });
  const upload = async (body: Buffer, as: string = token, purpose = 'avatar', type = 'image/jpeg') =>
    t.app.inject({
      method: 'POST',
      url: `/v1/media?purpose=${purpose}`,
      headers: { ...t.authed(as), 'content-type': type },
      payload: body,
    });

  describe('профиль', () => {
    it('после регистрации профиля нет; после заполнения он есть и виден по своему адресу', async () => {
      expect((await getMine()).json()).toEqual({ profile: null });

      const saved = await save({ displayName: ' Аня ', faculty: 'ФКТиПМ', course: 2, about: 'Люблю математику' });
      expect(saved.statusCode).toBe(200);
      const profile = myProfileResponseSchema.parse(saved.json()).profile!;
      expect(profile).toMatchObject({ displayName: 'Аня', faculty: 'ФКТиПМ', course: 2, about: 'Люблю математику', role: 'student', avatarUrl: null });

      const other = await t.registerAs('guest', 'guest@example.com');
      const seen = await t.app.inject({ method: 'GET', url: `/v1/profiles/${profile.profileId}`, headers: t.authed(other) });
      expect(profileSchema.parse(seen.json())).toEqual(profile);
    });

    it('обязательно только имя', async () => {
      expect((await save({ displayName: 'Аня' })).statusCode).toBe(200);
      const bad = await save({ displayName: '   ' });
      expect(bad.statusCode).toBe(400);
      expect(bad.json().error.code).toBe('validation_error');
    });

    it('редактирование меняет только переданное', async () => {
      await save({ displayName: 'Аня', faculty: 'ФКТиПМ', course: 2, about: 'текст' });
      const profile = (await save({ displayName: 'Анна', about: '' })).json().profile;
      expect(profile).toMatchObject({ displayName: 'Анна', faculty: 'ФКТиПМ', course: 2, about: null });
      expect(await t.db.select().from(profiles)).toHaveLength(1);
    });

    it('у преподавателя и гостя курса нет, даже если его прислать', async () => {
      const teacher = await t.registerAs('teacher', 'teacher@example.com');
      const profile = (await save({ displayName: 'Иван Петрович', course: 3 }, teacher)).json().profile;
      expect(profile).toMatchObject({ role: 'teacher', course: null });
    });

    it('чужой профиль без входа не посмотреть; несуществующий — 404', async () => {
      const mine = (await save({ displayName: 'Аня' })).json().profile;
      expect((await t.app.inject({ method: 'GET', url: `/v1/profiles/${mine.profileId}` })).statusCode).toBe(401);
      const missing = await t.app.inject({
        method: 'GET',
        url: '/v1/profiles/00000000-0000-4000-8000-000000000000',
        headers: t.authed(token),
      });
      expect(missing.statusCode).toBe(404);
      expect((await t.app.inject({ method: 'GET', url: '/v1/profiles/not-an-id', headers: t.authed(token) })).statusCode).toBe(400);
    });

    it('в профиле нет ничего, кроме открытых полей', async () => {
      const profile = (await save({ displayName: 'Аня' })).json().profile;
      expect(Object.keys(profile).sort()).toEqual(['about', 'avatarUrl', 'course', 'displayName', 'faculty', 'profileId', 'role']);
    });
  });

  describe('фото', () => {
    it('аватар загружается, привязывается к профилю и отдаётся картинкой', async () => {
      const uploaded = await upload(await photo());
      expect(uploaded.statusCode).toBe(200);
      const { mediaId, url } = uploaded.json();
      expect(url).toBe(`/v1/media/${mediaId}`);

      const profile = (await save({ displayName: 'Аня', avatarMediaId: mediaId })).json().profile;
      expect(profile.avatarUrl).toBe(url);

      const image = await t.app.inject({ method: 'GET', url });
      expect(image.statusCode).toBe(200);
      expect(image.headers['content-type']).toBe('image/jpeg');
      const meta = await sharp(image.rawPayload).metadata();
      expect([meta.width, meta.height]).toEqual([512, 512]);
    });

    it('сервер стирает служебные данные фото, в том числе место съёмки', async () => {
      const original = await photo();
      expect((await sharp(original).metadata()).exif).toBeDefined();

      const { url } = (await upload(original)).json();
      const stored = (await t.app.inject({ method: 'GET', url })).rawPayload;
      const meta = await sharp(stored).metadata();
      expect(meta.exif).toBeUndefined();
      expect(stored.includes(Buffer.from('секрет'))).toBe(false);
      expect(stored.includes(Buffer.from('GPS'))).toBe(false);
    });

    it('не картинка, SVG и подделка под картинку отклоняются', async () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      for (const body of [Buffer.from('это не фото'), svg]) {
        const response = await upload(body);
        expect(response.statusCode).toBe(400);
        expect(response.json().error.code).toBe('media_invalid');
      }
      const wrongType = await upload(svg, token, 'avatar', 'image/svg+xml');
      expect(wrongType.statusCode).toBe(415);
      expect(await t.db.select().from(mediaFiles)).toHaveLength(0);
      expect(t.media.files.size).toBe(0);
    });

    it('фото больше 10 МБ отклоняется', async () => {
      const response = await upload(Buffer.alloc(10 * 1024 * 1024 + 1, 1));
      expect(response.statusCode).toBe(413);
      expect(response.json().error.code).toBe('media_too_large');
    });

    it('без входа и с неизвестным назначением загрузить нельзя', async () => {
      const body = await photo();
      const anonymous = await t.app.inject({ method: 'POST', url: '/v1/media?purpose=avatar', headers: { 'content-type': 'image/jpeg' }, payload: body });
      expect(anonymous.statusCode).toBe(401);
      expect((await upload(body, token, 'whatever')).statusCode).toBe(400);
    });

    it('гость может загрузить аватар, но не фото для поста или истории', async () => {
      const guest = await t.registerAs('guest', 'guest@example.com');
      const body = await photo();
      expect((await upload(body, guest, 'avatar')).statusCode).toBe(200);
      for (const purpose of ['post', 'story']) {
        const response = await upload(body, guest, purpose);
        expect(response.statusCode).toBe(403);
        expect(response.json().error.code).toBe('forbidden');
      }
    });

    it('нельзя поставить аватаром чужое фото', async () => {
      const other = await t.registerAs('student', 'other@example.com');
      const { mediaId } = (await upload(await photo(), other)).json();
      const response = await save({ displayName: 'Аня', avatarMediaId: mediaId });
      expect(response.statusCode).toBe(400);
    });

    it('при замене и при удалении аватара старый файл стирается', async () => {
      const first = (await upload(await photo())).json().mediaId;
      await save({ displayName: 'Аня', avatarMediaId: first });
      const second = (await upload(await photo(300, 300))).json().mediaId;
      await save({ displayName: 'Аня', avatarMediaId: second });
      expect([...t.media.files.keys()]).toEqual([`${second}.jpg`]);

      const cleared = (await save({ displayName: 'Аня', avatarMediaId: null })).json().profile;
      expect(cleared.avatarUrl).toBeNull();
      expect(t.media.files.size).toBe(0);
      expect((await t.app.inject({ method: 'GET', url: `/v1/media/${second}` })).statusCode).toBe(404);
    });

    it('удаление аккаунта стирает профиль, записи о фото и сами файлы', async () => {
      const { mediaId } = (await upload(await photo())).json();
      await save({ displayName: 'Аня', avatarMediaId: mediaId });
      await upload(await photo(), token, 'post');
      expect(t.media.files.size).toBe(2);

      const removed = await t.app.inject({ method: 'DELETE', url: '/v1/account', headers: t.authed(token) });
      expect(removed.statusCode).toBe(200);
      expect(await t.db.select().from(profiles)).toHaveLength(0);
      expect(await t.db.select().from(mediaFiles)).toHaveLength(0);
      expect(t.media.files.size).toBe(0);
    });
  });
});
