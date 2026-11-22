import { commentsPageSchema, postSchema, postsPageSchema, type Role } from '@app/shared';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mediaFiles, postComments, postLikes, postPhotos, postReports, posts, profiles } from '../../db/schema';
import { createTestContext, type TestContext } from '../../testing';

const SOME_ID = '00000000-0000-4000-8000-000000000000';
const photo = (width = 640, height = 480) =>
  sharp({ create: { width, height, channels: 3, background: { r: 30, g: 140, b: 200 } } }).jpeg().toBuffer();

async function setup() {
  const t = await createTestContext();
  const member = async (role: Role, email: string, displayName: string) => {
    const token = await t.registerAs(role, email);
    const saved = await t.app.inject({ method: 'PUT', url: '/v1/profile', headers: t.authed(token), payload: { displayName } });
    return { token, profileId: saved.json().profile.profileId as string };
  };
  const upload = async (token: string, purpose = 'post', size: [number, number] = [640, 480]) => {
    const response = await t.app.inject({
      method: 'POST',
      url: `/v1/media?purpose=${purpose}`,
      headers: { ...t.authed(token), 'content-type': 'image/jpeg' },
      payload: await photo(...size),
    });
    return response.json().mediaId as string;
  };
  const call = (method: string, url: string, token: string, payload?: unknown) =>
    t.app.inject({ method: method as 'GET', url, headers: t.authed(token), ...(payload === undefined ? {} : { payload: payload as object }) });
  const publish = async (token: string, payload: Record<string, unknown>) => (await call('POST', '/v1/posts', token, payload)).json();
  return { t, member, upload, call, publish };
}

type Kit = Awaited<ReturnType<typeof setup>>;

describe('посты', () => {
  let k: Kit;
  let t: TestContext;
  let anya: { token: string; profileId: string };
  let boris: { token: string; profileId: string };
  let teacher: { token: string; profileId: string };
  let guest: { token: string; profileId: string };

  beforeAll(async () => {
    k = await setup();
    t = k.t;
    anya = await k.member('student', 'anya@example.com', 'Аня');
    boris = await k.member('student', 'boris@example.com', 'Борис');
    teacher = await k.member('teacher', 'teacher@example.com', 'Иван Петрович');
    guest = await k.member('guest', 'guest@example.com', 'Гость');
  });

  afterAll(async () => {
    await t.close();
  });

  describe('публикация', () => {
    it('пост с текстом виден автору и другим; автор — открытый профиль', async () => {
      const created = await k.call('POST', '/v1/posts', anya.token, { text: '  Привет, соцсеть!  ' });
      expect(created.statusCode).toBe(200);
      const post = postSchema.parse(created.json());
      expect(post).toMatchObject({
        text: 'Привет, соцсеть!',
        photos: [],
        likeCount: 0,
        likedByMe: false,
        commentCount: 0,
        canDelete: true,
        author: { profileId: anya.profileId, displayName: 'Аня', role: 'student', avatarUrl: null },
      });

      const seen = postSchema.parse((await k.call('GET', `/v1/posts/${post.postId}`, guest.token)).json());
      expect(seen.canDelete).toBe(false);
      expect(seen.text).toBe('Привет, соцсеть!');
    });

    it('фото прикрепляются в заданном порядке и отдаются картинками', async () => {
      const first = await k.upload(anya.token, 'post', [800, 400]);
      const second = await k.upload(anya.token, 'post', [300, 600]);
      const post = postSchema.parse(await k.publish(anya.token, { photoMediaIds: [second, first] }));
      expect(post.text).toBe('');
      expect(post.photos).toEqual([
        { url: `/v1/media/${second}`, width: 300, height: 600 },
        { url: `/v1/media/${first}`, width: 800, height: 400 },
      ]);
      expect((await t.app.inject({ method: 'GET', url: post.photos[0]!.url })).statusCode).toBe(200);
    });

    it('преподаватель тоже может публиковать', async () => {
      const post = await k.publish(teacher.token, { text: 'Консультация в четверг' });
      expect(post.author.role).toBe('teacher');
    });

    it('пустой пост и больше 10 фото отклоняются', async () => {
      for (const payload of [{}, { text: '   ' }, { photoMediaIds: Array.from({ length: 11 }, () => SOME_ID) }]) {
        const response = await k.call('POST', '/v1/posts', anya.token, payload);
        expect(response.statusCode).toBe(400);
        expect(response.json().error.code).toBe('validation_error');
      }
    });

    it('нельзя прикрепить чужое фото, аватар или фото из другого поста', async () => {
      const foreign = await k.upload(boris.token);
      const avatar = await k.upload(anya.token, 'avatar');
      const used = await k.upload(anya.token);
      await k.publish(anya.token, { photoMediaIds: [used] });
      for (const mediaId of [foreign, avatar, used, SOME_ID]) {
        const response = await k.call('POST', '/v1/posts', anya.token, { text: 'x', photoMediaIds: [mediaId] });
        expect(response.statusCode, mediaId).toBe(400);
      }
    });

    it('без заполненного профиля публиковать, лайкать и комментировать нельзя', async () => {
      const noProfile = await t.registerAs('student', 'noprofile@example.com');
      const post = await k.publish(anya.token, { text: 'пост' });
      for (const [method, url, payload] of [
        ['POST', '/v1/posts', { text: 'x' }],
        ['PUT', `/v1/posts/${post.postId}/like`, undefined],
        ['POST', `/v1/posts/${post.postId}/comments`, { text: 'x' }],
      ] as const) {
        const response = await k.call(method, url, noProfile, payload);
        expect(response.statusCode).toBe(409);
        expect(response.json().error.code).toBe('profile_required');
      }
      expect((await k.call('GET', `/v1/posts/${post.postId}`, noProfile)).statusCode).toBe(200);
    });

    it('без входа ничего не видно', async () => {
      expect((await t.app.inject({ method: 'GET', url: `/v1/posts/${SOME_ID}` })).statusCode).toBe(401);
      expect((await t.app.inject({ method: 'GET', url: `/v1/profiles/${anya.profileId}/posts` })).statusCode).toBe(401);
    });

    it('несуществующий пост — 404, кривой идентификатор — 400', async () => {
      expect((await k.call('GET', `/v1/posts/${SOME_ID}`, anya.token)).statusCode).toBe(404);
      expect((await k.call('GET', '/v1/posts/not-an-id', anya.token)).statusCode).toBe(400);
    });
  });

  describe('гость только смотрит', () => {
    it('получает отказ на КАЖДОМ запросе постов, который что-то меняет (кроме жалобы)', async () => {
      const post = await k.publish(anya.token, { text: 'пост' });
      const comment = (await k.call('POST', `/v1/posts/${post.postId}/comments`, anya.token, { text: 'комментарий' })).json();
      const changing = t.routes.filter(
        (route) => route.url.startsWith('/v1/posts') && !['GET', 'HEAD'].includes(route.method) && !route.url.endsWith('/report'),
      );
      expect(changing.length).toBeGreaterThanOrEqual(6);
      for (const route of changing) {
        const url = route.url.replace(':postId', post.postId).replace(':commentId', comment.commentId);
        const response = await k.call(route.method, url, guest.token, route.method === 'DELETE' ? undefined : { text: 'x' });
        expect(response.statusCode, `${route.method} ${route.url}`).toBe(403);
        expect(response.json().error.code).toBe('forbidden');
      }
      const after = postSchema.parse((await k.call('GET', `/v1/posts/${post.postId}`, guest.token)).json());
      expect([after.likeCount, after.commentCount]).toEqual([0, 1]);
    });

    it('но видит посты, комментарии и может пожаловаться', async () => {
      const post = await k.publish(anya.token, { text: 'пост' });
      expect((await k.call('GET', `/v1/posts/${post.postId}/comments`, guest.token)).statusCode).toBe(200);
      expect((await k.call('GET', `/v1/profiles/${anya.profileId}/posts`, guest.token)).statusCode).toBe(200);
      expect((await k.call('POST', `/v1/posts/${post.postId}/report`, guest.token, { reason: 'спам' })).statusCode).toBe(200);
    });
  });

  describe('лайки', () => {
    it('ставятся по одному от человека и снимаются; у каждого своё «нравится»', async () => {
      const post = await k.publish(anya.token, { text: 'пост' });
      const like = (token: string, method = 'PUT') => k.call(method, `/v1/posts/${post.postId}/like`, token);

      expect((await like(boris.token)).json()).toEqual({ likeCount: 1, likedByMe: true });
      expect((await like(boris.token)).json()).toEqual({ likeCount: 1, likedByMe: true });
      expect((await like(teacher.token)).json()).toEqual({ likeCount: 2, likedByMe: true });

      const forAnya = (await k.call('GET', `/v1/posts/${post.postId}`, anya.token)).json();
      expect([forAnya.likeCount, forAnya.likedByMe]).toEqual([2, false]);

      expect((await like(boris.token, 'DELETE')).json()).toEqual({ likeCount: 1, likedByMe: false });
      expect((await like(boris.token, 'DELETE')).json()).toEqual({ likeCount: 1, likedByMe: false });
    });

    it('лайк несуществующего поста — 404', async () => {
      expect((await k.call('PUT', `/v1/posts/${SOME_ID}/like`, boris.token)).statusCode).toBe(404);
    });
  });

  describe('комментарии', () => {
    it('идут от старых к новым; пустой и слишком длинный отклоняются', async () => {
      const post = await k.publish(anya.token, { text: 'пост' });
      const url = `/v1/posts/${post.postId}/comments`;
      await k.call('POST', url, boris.token, { text: 'первый' });
      await k.call('POST', url, teacher.token, { text: ' второй ' });
      expect((await k.call('POST', url, boris.token, { text: '   ' })).statusCode).toBe(400);
      expect((await k.call('POST', url, boris.token, { text: 'а'.repeat(1001) })).statusCode).toBe(400);

      const page = commentsPageSchema.parse((await k.call('GET', url, guest.token)).json());
      expect(page.comments.map((comment) => [comment.text, comment.author.displayName])).toEqual([
        ['первый', 'Борис'],
        ['второй', 'Иван Петрович'],
      ]);
      expect(page.nextCursor).toBeNull();
      expect((await k.call('GET', `/v1/posts/${post.postId}`, anya.token)).json().commentCount).toBe(2);
    });

    it('удалить может автор комментария и автор поста, остальные — нет', async () => {
      const post = await k.publish(anya.token, { text: 'пост' });
      const url = `/v1/posts/${post.postId}/comments`;
      const mine = (await k.call('POST', url, boris.token, { text: 'мой' })).json();
      const other = (await k.call('POST', url, boris.token, { text: 'ещё' })).json();

      const forTeacher = (await k.call('GET', url, teacher.token)).json().comments;
      const forAnya = (await k.call('GET', url, anya.token)).json().comments;
      expect(forTeacher.map((comment: { canDelete: boolean }) => comment.canDelete)).toEqual([false, false]);
      expect(forAnya.map((comment: { canDelete: boolean }) => comment.canDelete)).toEqual([true, true]);

      expect((await k.call('DELETE', `/v1/posts/comments/${mine.commentId}`, teacher.token)).statusCode).toBe(403);
      expect((await k.call('DELETE', `/v1/posts/comments/${mine.commentId}`, boris.token)).statusCode).toBe(200);
      expect((await k.call('DELETE', `/v1/posts/comments/${other.commentId}`, anya.token)).statusCode).toBe(200);
      expect((await k.call('DELETE', `/v1/posts/comments/${other.commentId}`, anya.token)).statusCode).toBe(404);
      expect((await k.call('GET', url, anya.token)).json().comments).toEqual([]);
    });

    it('длинное обсуждение отдаётся порциями по 50', async () => {
      const post = await k.publish(anya.token, { text: 'пост' });
      const base = Date.now();
      await t.db.insert(postComments).values(
        Array.from({ length: 55 }, (_, index) => ({
          postId: post.postId,
          authorProfileId: boris.profileId,
          text: `№${index + 1}`,
          createdAt: new Date(base + index * 1000),
        })),
      );
      const url = `/v1/posts/${post.postId}/comments`;
      const first = commentsPageSchema.parse((await k.call('GET', url, anya.token)).json());
      expect(first.comments).toHaveLength(50);
      expect(first.comments[0]?.text).toBe('№1');
      const second = commentsPageSchema.parse(
        (await k.call('GET', `${url}?after=${encodeURIComponent(first.nextCursor!)}`, anya.token)).json(),
      );
      expect(second.comments.map((comment) => comment.text)).toEqual(['№51', '№52', '№53', '№54', '№55']);
      expect(second.nextCursor).toBeNull();
      expect((await k.call('GET', `${url}?after=мусор`, anya.token)).statusCode).toBe(400);
    });
  });

  describe('жалобы', () => {
    it('жалоба записывается один раз от человека; на несуществующее — 404', async () => {
      const post = await k.publish(anya.token, { text: 'пост' });
      const comment = (await k.call('POST', `/v1/posts/${post.postId}/comments`, anya.token, { text: 'к' })).json();
      const before = (await t.db.select().from(postReports)).length;

      await k.call('POST', `/v1/posts/${post.postId}/report`, boris.token, { reason: 'оскорбление' });
      await k.call('POST', `/v1/posts/${post.postId}/report`, boris.token, { reason: 'ещё раз' });
      await k.call('POST', `/v1/posts/${post.postId}/report`, teacher.token);
      await k.call('POST', `/v1/posts/comments/${comment.commentId}/report`, boris.token, {});
      expect((await t.db.select().from(postReports)).length).toBe(before + 3);

      expect((await k.call('POST', `/v1/posts/${SOME_ID}/report`, boris.token, {})).statusCode).toBe(404);
    });
  });
});

describe('посты: список, удаление', () => {
  it('посты человека идут от новых к старым порциями по 20', async () => {
    const k = await setup();
    const anya = await k.member('student', 'anya@example.com', 'Аня');
    const boris = await k.member('student', 'boris@example.com', 'Борис');
    const base = Date.now();
    await k.t.db.insert(posts).values(
      Array.from({ length: 25 }, (_, index) => ({ authorProfileId: anya.profileId, text: `пост ${index + 1}`, createdAt: new Date(base + index * 1000) })),
    );
    await k.publish(boris.token, { text: 'чужой' });

    const url = `/v1/profiles/${anya.profileId}/posts`;
    const first = postsPageSchema.parse((await k.call('GET', url, boris.token)).json());
    expect(first.posts).toHaveLength(20);
    expect(first.posts[0]?.text).toBe('пост 25');
    const second = postsPageSchema.parse((await k.call('GET', `${url}?before=${encodeURIComponent(first.nextCursor!)}`, boris.token)).json());
    expect(second.posts.map((post) => post.text)).toEqual(['пост 5', 'пост 4', 'пост 3', 'пост 2', 'пост 1']);
    expect(second.nextCursor).toBeNull();
    expect((await k.call('GET', `/v1/profiles/${SOME_ID}/posts`, boris.token)).statusCode).toBe(404);
    await k.t.close();
  });

  it('удалить пост может только автор; вместе с постом исчезают фото, лайки и комментарии', async () => {
    const k = await setup();
    const anya = await k.member('student', 'anya@example.com', 'Аня');
    const boris = await k.member('student', 'boris@example.com', 'Борис');
    const post = await k.publish(anya.token, { text: 'с фото', photoMediaIds: [await k.upload(anya.token), await k.upload(anya.token)] });
    await k.call('PUT', `/v1/posts/${post.postId}/like`, boris.token);
    await k.call('POST', `/v1/posts/${post.postId}/comments`, boris.token, { text: 'класс' });
    expect(k.t.media.files.size).toBe(2);

    const denied = await k.call('DELETE', `/v1/posts/${post.postId}`, boris.token);
    expect(denied.statusCode).toBe(403);

    expect((await k.call('DELETE', `/v1/posts/${post.postId}`, anya.token)).statusCode).toBe(200);
    expect((await k.call('GET', `/v1/posts/${post.postId}`, boris.token)).statusCode).toBe(404);
    for (const table of [posts, postPhotos, postLikes, postComments, mediaFiles]) {
      expect(await k.t.db.select().from(table)).toHaveLength(0);
    }
    expect(k.t.media.files.size).toBe(0);
    await k.t.close();
  });

  it('удаление аккаунта стирает его посты, фото, лайки и комментарии, а чужое не трогает', async () => {
    const k = await setup();
    const anya = await k.member('student', 'anya@example.com', 'Аня');
    const boris = await k.member('student', 'boris@example.com', 'Борис');
    await k.publish(anya.token, { text: 'пост Ани', photoMediaIds: [await k.upload(anya.token)] });
    const borisPost = await k.publish(boris.token, { text: 'пост Бориса', photoMediaIds: [await k.upload(boris.token)] });
    await k.call('PUT', `/v1/posts/${borisPost.postId}/like`, anya.token);
    await k.call('POST', `/v1/posts/${borisPost.postId}/comments`, anya.token, { text: 'от Ани' });

    expect((await k.call('DELETE', '/v1/account', anya.token)).statusCode).toBe(200);

    expect((await k.t.db.select().from(profiles)).map((row) => row.displayName)).toEqual(['Борис']);
    expect((await k.t.db.select().from(posts)).map((row) => row.text)).toEqual(['пост Бориса']);
    expect(await k.t.db.select().from(postLikes)).toHaveLength(0);
    expect(await k.t.db.select().from(postComments)).toHaveLength(0);
    expect(k.t.media.files.size).toBe(1);
    const left = (await k.call('GET', `/v1/posts/${borisPost.postId}`, boris.token)).json();
    expect([left.likeCount, left.commentCount, left.photos.length]).toEqual([0, 0, 1]);
    await k.t.close();
  });
});
