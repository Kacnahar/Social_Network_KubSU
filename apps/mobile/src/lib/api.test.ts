import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, authVerify, fetchHealth, getPushConfig, logout, subscribePush, unsubscribePush } from './api';

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
});
