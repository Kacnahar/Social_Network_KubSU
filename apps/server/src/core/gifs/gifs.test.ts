import { commentSchema, gifsPageSchema, postSchema } from '@app/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from '../../testing';
import { createGifsRuProvider, parseGifsRuPage } from './gifsru';

const SECRET_KEY = 'secret-gifs-ru-key';
const HOST = 'https://gifs.obs.ru-moscow-1.hc.sbercloud.ru';

const item = (id: string) => ({
  id,
  title: 'Кот',
  tags: ['кот'],
  url: `https://gifs.ru/gifs/${id}`,
  media_formats: {
    gif: { url: `${HOST}/${id}.gif`, dims: [390, 304], size: null },
    mediumgif: { url: `${HOST}/${id}_500.webp`, dims: [641, 500], size: null },
    tinygif: { url: `${HOST}/${id}_300.webp`, dims: [385, 300], size: null },
  },
});

// Токен gifs.ru с заданным сроком жизни (как настоящий: три части через точку)
const jwt = (expiresInSeconds: number) =>
  `h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds })).toString('base64url')}.s`;

describe('разбор ответа gifs.ru', () => {
  it('оставляет только id, два адреса и размеры; негодные записи пропускает', () => {
    const page = parseGifsRuPage({ results: [item('101'), { id: '102', media_formats: {} }, { title: 'без id' }, item('101')], next: '4' });
    expect(page).toEqual({
      gifs: [{ id: '101', previewUrl: `${HOST}/101_300.webp`, url: `${HOST}/101_500.webp`, width: 641, height: 500 }],
      next: '4',
    });
  });

  it('видео вместо картинки не берёт: полная версия — средняя или маленькая', () => {
    const video = item('7');
    video.media_formats.gif.url = `${HOST}/7_prepared.mp4`;
    delete (video.media_formats as Partial<typeof video.media_formats>).mediumgif;
    expect(parseGifsRuPage({ results: [video], next: '' }).gifs).toEqual([
      { id: '7', previewUrl: `${HOST}/7_300.webp`, url: `${HOST}/7_300.webp`, width: 385, height: 300 },
    ]);
  });

  it('не берёт картинки с чужих адресов', () => {
    const bad = item('5');
    bad.media_formats.tinygif.url = 'https://evil.example.com/x.webp';
    expect(parseGifsRuPage({ results: [bad], next: '' }).gifs).toEqual([]);
  });

  it('последняя порция — без продолжения', () => {
    expect(parseGifsRuPage({ results: [item('1')], next: '' }).next).toBeNull();
    expect(parseGifsRuPage({ results: [], next: '24' })).toEqual({ gifs: [], next: null });
  });

  it('непонятный ответ — ошибка', () => {
    expect(() => parseGifsRuPage(null)).toThrow();
    expect(() => parseGifsRuPage({ error: 'Too many requests' })).toThrow();
  });
});

describe('запрос в gifs.ru', () => {
  type Call = { url: URL; init: RequestInit | undefined };
  const fake = (answer: (call: Call, calls: Call[]) => Response) => {
    const calls: Call[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      const call = { url: new URL(url), init };
      calls.push(call);
      return answer(call, calls);
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  };
  const page = () => Response.json({ results: [item('1')], next: '24' });
  const auth = (call: Call) => (call.init?.headers as Record<string, string>).authorization;

  it('сначала меняет ключ на временный токен, потом ищет с ним; токен берёт один раз', async () => {
    const token = jwt(8 * 3600);
    const { calls, fetchImpl } = fake((call) => (call.url.pathname.endsWith('/auth/token') ? Response.json({ token }) : page()));
    const provider = createGifsRuProvider(SECRET_KEY, fetchImpl);

    await provider.search('привет', '24');
    await provider.trending();

    expect(calls.map((call) => call.url.pathname)).toEqual(['/api/v2/auth/token', '/api/v2/search', '/api/v2/featured']);
    expect(calls[0]!.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({ clientId: SECRET_KEY });
    expect(Object.fromEntries(calls[1]!.url.searchParams)).toEqual({ q: 'привет', limit: '24', media_filter: 'tinygif,mediumgif,gif', pos: '24' });
    expect(auth(calls[1]!)).toBe(`Bearer ${token}`);
    // Ключ уходит только при обмене на токен и никогда — в адресе
    expect(calls.every((call) => !call.url.href.includes(SECRET_KEY))).toBe(true);
    expect(calls.slice(1).every((call) => !JSON.stringify(call.init).includes(SECRET_KEY))).toBe(true);
  });

  it('устаревший токен обновляет и повторяет запрос один раз', async () => {
    let issued = 0;
    const { calls, fetchImpl } = fake((call) => {
      if (call.url.pathname.endsWith('/auth/token')) return Response.json({ token: jwt(8 * 3600 + ++issued) });
      return issued === 1 ? new Response('{"error":{"message":"Token expired"}}', { status: 401 }) : page();
    });
    const provider = createGifsRuProvider(SECRET_KEY, fetchImpl);
    expect((await provider.search('кот')).gifs).toHaveLength(1);
    expect(calls.map((call) => call.url.pathname)).toEqual(['/api/v2/auth/token', '/api/v2/search', '/api/v2/auth/token', '/api/v2/search']);
  });

  it('токен с истёкшим сроком заранее меняет на новый', async () => {
    let issued = 0;
    const { calls, fetchImpl } = fake((call) => (call.url.pathname.endsWith('/auth/token') ? Response.json({ token: jwt(++issued === 1 ? 60 : 8 * 3600) }) : page()));
    const provider = createGifsRuProvider(SECRET_KEY, fetchImpl);
    await provider.trending();
    await provider.trending();
    expect(calls.filter((call) => call.url.pathname.endsWith('/auth/token'))).toHaveLength(2);
  });

  it('в тексте ошибки нет ключа', async () => {
    const failing = createGifsRuProvider(SECRET_KEY, (async (url: string, init?: RequestInit) => {
      throw new Error(`fetch failed: ${url} ${String(init?.body)}`);
    }) as unknown as typeof fetch);
    await expect(failing.trending()).rejects.toThrow('gifs.ru не отвечает');
    await failing.trending().catch((error: Error) => expect(String(error) + String(error.cause)).not.toContain(SECRET_KEY));

    const rejected = createGifsRuProvider(SECRET_KEY, (async () => new Response('{"error":"Invalid client"}', { status: 401 })) as unknown as typeof fetch);
    await expect(rejected.search('кот')).rejects.toThrow('gifs.ru не принял ключ (код 401)');

    const limited = fake((call) => (call.url.pathname.endsWith('/auth/token') ? Response.json({ token: jwt(3600 * 8) }) : new Response('{"error":"Too many requests"}', { status: 429 })));
    await expect(createGifsRuProvider(SECRET_KEY, limited.fetchImpl).search('кот')).rejects.toThrow('gifs.ru ответил с кодом 429');
  });
});

describe('GIF через наш сервер', () => {
  let t: TestContext;
  let student: string;
  let guest: string;
  const get = (url: string, token?: string) => t.app.inject({ method: 'GET', url, headers: token ? t.authed(token) : {} });

  beforeAll(async () => {
    t = await createTestContext({ GIFS_RATE_LIMIT_PER_MINUTE: '1000' });
    student = await t.registerAs('student', 'gif-student@example.com');
    guest = await t.registerAs('guest', 'gif-guest@example.com');
    await t.app.inject({ method: 'PUT', url: '/v1/profile', headers: t.authed(student), payload: { displayName: 'Аня' } });
  });
  afterAll(() => t.close());

  it('без входа и гостю GIF не отдаёт', async () => {
    expect((await get('/v1/gifs/trending')).statusCode).toBe(401);
    expect((await get('/v1/gifs/trending', guest)).statusCode).toBe(403);
    expect((await get('/v1/gifs/search?q=кот', guest)).statusCode).toBe(403);
    expect(t.gifs.calls).toEqual([]);
  });

  it('популярные: отдаёт порцию и второй раз берёт её из кэша', async () => {
    const first = await get('/v1/gifs/trending', student);
    expect(first.statusCode).toBe(200);
    expect(gifsPageSchema.parse(first.json())).toEqual(t.gifs.page);
    await get('/v1/gifs/trending', student);
    expect(t.gifs.calls.filter((call) => call.kind === 'trending')).toHaveLength(1);
  });

  it('поиск: по-русски и по-английски, регистр не важен, продолжение по pos', async () => {
    expect((await get(`/v1/gifs/search?q=${encodeURIComponent('Привет')}`, student)).statusCode).toBe(200);
    expect((await get(`/v1/gifs/search?q=${encodeURIComponent('привет ')}`, student)).statusCode).toBe(200);
    expect((await get('/v1/gifs/search?q=hello&pos=24', student)).statusCode).toBe(200);
    expect(t.gifs.calls.filter((call) => call.kind === 'search')).toEqual([
      { kind: 'search', query: 'привет', pos: undefined },
      { kind: 'search', query: 'hello', pos: '24' },
    ]);
  });

  it('пустой или слишком длинный запрос отклоняет', async () => {
    expect((await get('/v1/gifs/search', student)).statusCode).toBe(400);
    expect((await get('/v1/gifs/search?q=%20', student)).statusCode).toBe(400);
    expect((await get(`/v1/gifs/search?q=${'a'.repeat(51)}`, student)).statusCode).toBe(400);
    expect((await get('/v1/gifs/search?q=cat&pos=a%20b', student)).statusCode).toBe(400);
  });

  it('gifs.ru недоступен — понятная ошибка, а не падение', async () => {
    t.gifs.down = true;
    const response = await get('/v1/gifs/search?q=sad', student);
    t.gifs.down = false;
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('gifs_unavailable');
    // Ошибка в кэш не попадает: следующий запрос проходит
    expect((await get('/v1/gifs/search?q=sad', student)).statusCode).toBe(200);
  });

  it('GIF сохраняется в посте и комментарии', async () => {
    const gif = t.gifs.page.gifs[0]!;
    const created = await t.app.inject({ method: 'POST', url: '/v1/posts', headers: t.authed(student), payload: { gif } });
    expect(created.statusCode).toBe(200);
    const post = postSchema.parse(created.json());
    expect(post.gif).toEqual(gif);
    expect(post.text).toBe('');
    expect(postSchema.parse((await get(`/v1/posts/${post.postId}`, student)).json()).gif).toEqual(gif);

    const commented = await t.app.inject({ method: 'POST', url: `/v1/posts/${post.postId}/comments`, headers: t.authed(student), payload: { gif } });
    expect(commented.statusCode).toBe(200);
    expect(commentSchema.parse(commented.json())).toMatchObject({ text: '', gif });
    const listed = (await get(`/v1/posts/${post.postId}/comments`, student)).json();
    expect(listed.comments[0].gif).toEqual(gif);

    const plain = await t.app.inject({ method: 'POST', url: `/v1/posts/${post.postId}/comments`, headers: t.authed(student), payload: { text: 'Без GIF' } });
    expect(plain.json().gif).toBeNull();
  });

  it('не принимает GIF с чужого адреса, GIF вместе с фото и пустой комментарий', async () => {
    const gif = t.gifs.page.gifs[0]!;
    const post = (await t.app.inject({ method: 'POST', url: '/v1/posts', headers: t.authed(student), payload: { text: 'Пост' } })).json();
    const send = (url: string, payload: object) => t.app.inject({ method: 'POST', url, headers: t.authed(student), payload });
    expect((await send('/v1/posts', { gif: { ...gif, url: 'https://evil.example.com/x.gif' } })).statusCode).toBe(400);
    expect((await send('/v1/posts', { gif: { ...gif, previewUrl: 'http://media.gifs.ru/x.webp' } })).statusCode).toBe(400);
    expect((await send('/v1/posts', { gif, photoMediaIds: ['00000000-0000-4000-8000-000000000001'] })).statusCode).toBe(400);
    expect((await send(`/v1/posts/${post.postId}/comments`, {})).statusCode).toBe(400);
    expect((await send(`/v1/posts/${post.postId}/comments`, { text: '  ' })).statusCode).toBe(400);
  });
});

describe('ограничения GIF', () => {
  it('не больше заданного числа запросов в минуту на человека', async () => {
    const t = await createTestContext({ GIFS_RATE_LIMIT_PER_MINUTE: '2' });
    const first = await t.registerAs('student', 'gif-limit-1@example.com');
    const second = await t.registerAs('student', 'gif-limit-2@example.com');
    const get = (token: string) => t.app.inject({ method: 'GET', url: '/v1/gifs/trending', headers: t.authed(token) });
    expect((await get(first)).statusCode).toBe(200);
    expect((await get(first)).statusCode).toBe(200);
    const blocked = await get(first);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error.code).toBe('too_many_requests');
    // У другого человека свой счёт
    expect((await get(second)).statusCode).toBe(200);
    await t.close();
  });

  it('без ключа gifs.ru отвечает «недоступно»', async () => {
    const { buildApp } = await import('../../app');
    const t = await createTestContext();
    const app = await buildApp({ config: t.config, db: t.db, mailer: t.mailer, push: null, voice: null, media: t.media, gifs: null });
    const token = await t.registerAs('student', 'gif-nokey@example.com');
    const response = await app.inject({ method: 'GET', url: '/v1/gifs/trending', headers: t.authed(token) });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('gifs_unavailable');
    await app.close();
    await t.close();
  });
});
