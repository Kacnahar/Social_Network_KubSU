import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  authGuest,
  authVerify,
  checkUsername,
  fetchHealth,
  getProfile,
  getProfileById,
  getPushConfig,
  logout,
  mediaUrl,
  subscribePush,
  unsubscribePush,
  updateProfile,
  uploadMedia,
} from './api';

const profile = {
  profileId: 'p1',
  displayName: 'Аня',
  avatarUrl: null,
  faculty: null,
  course: null,
  about: null,
  role: 'student',
  username: 'anya.p',
  department: null,
  links: [],
  birthDate: null,
};
const privacy = { showFaculty: true, showBirth: false, showFriends: true, showOnline: true };

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('клиент API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('возвращает разобранный ответ сервера', async () => {
    const fetchMock = mockFetch(200, {
      status: 'ok',
      service: 'app-server',
      version: '0.0.0',
      time: '2026-11-22T00:00:00.000Z',
    });
    const health = await fetchHealth('http://test');
    expect(health.status).toBe('ok');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://test/v1/health');
  });

  it('передаёт токен в заголовке', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    await logout('secret-token');
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer secret-token' });
  });

  it('превращает ошибку сервера в ApiError с кодом и текстом', async () => {
    mockFetch(400, { error: { code: 'invalid_code', message: 'Код не подошёл или устарел' } });
    const error = await authVerify('a@b.ru', '123456').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('invalid_code');
    expect((error as ApiError).message).toBe('Код не подошёл или устарел');
  });

  it('при непонятной ошибке сервера не падает, а даёт общий текст', async () => {
    mockFetch(500, 'oops');
    await expect(fetchHealth('http://test')).rejects.toMatchObject({ code: 'internal_error' });
  });

  it('при неожиданном формате ответа даёт ошибку', async () => {
    mockFetch(200, { hello: 'world' });
    await expect(fetchHealth('http://test')).rejects.toMatchObject({ code: 'internal_error' });
  });

  it('при отсутствии связи даёт понятную ошибку', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(fetchHealth('http://test')).rejects.toMatchObject({ code: 'network_error' });
  });

  it('getPushConfig работает без токена', async () => {
    const fetchMock = mockFetch(200, { vapidPublicKey: null });
    expect((await getPushConfig()).vapidPublicKey).toBeNull();
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty('authorization');
  });

  it('subscribePush отправляет подписку POST-ом', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    const body = { endpoint: 'https://push.example/abc', keys: { p256dh: 'k', auth: 'a' } };
    await subscribePush('tok', body);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify(body));
  });

  it('unsubscribePush отправляет endpoint DELETE-ом', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    await unsubscribePush('tok', 'https://push.example/abc');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE');
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ endpoint: 'https://push.example/abc' }));
  });

  it('getProfile возвращает профиль или null', async () => {
    const fetchMock = mockFetch(200, { profile: null, privacy: null });
    expect(await getProfile('tok')).toBeNull();
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/profile$/);
  });

  it('updateProfile отправляет PUT и возвращает профиль', async () => {
    const fetchMock = mockFetch(200, { profile, privacy });
    const result = await updateProfile('tok', { displayName: 'Аня' });
    expect(result.displayName).toBe('Аня');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT');
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ displayName: 'Аня' }));
  });

  it('authGuest входит без почты и возвращает токен', async () => {
    const fetchMock = mockFetch(200, { token: 'guest-token' });
    expect(await authGuest()).toBe('guest-token');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/auth\/guest$/);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
  });

  it('checkUsername спрашивает сервер, свободен ли никнейм', async () => {
    const fetchMock = mockFetch(200, { available: false });
    expect(await checkUsername('tok', 'anya.p')).toBe(false);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/profile\/username-available\?username=anya\.p$/);
  });

  it('getProfileById просит профиль по id', async () => {
    const fetchMock = mockFetch(200, profile);
    expect((await getProfileById('tok', 'p 1')).profileId).toBe('p1');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/profiles\/p%201$/);
  });

  it('uploadMedia шлёт байты с типом картинки', async () => {
    const fetchMock = mockFetch(200, { mediaId: 'm1', url: '/v1/media/m1' });
    const blob = new Blob(['x'], { type: 'image/png' });
    expect((await uploadMedia('tok', 'avatar', blob)).mediaId).toBe('m1');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/media\?purpose=avatar$/);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ 'content-type': 'image/png', authorization: 'Bearer tok' });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(blob);
  });

  it('mediaUrl склеивает адрес сервера и путь', () => {
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl('/v1/media/m1')).toMatch(/^https?:\/\/.+\/v1\/media\/m1$/);
    expect(mediaUrl('/v1/media/m1')).not.toContain('/v1/v1');
  });
});
