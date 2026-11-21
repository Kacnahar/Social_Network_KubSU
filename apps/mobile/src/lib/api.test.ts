import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './api';

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

describe('fetchHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('возвращает разобранный ответ сервера', async () => {
    mockFetch(200, {
      status: 'ok',
      service: 'rooms-server',
      version: '0.0.0',
      time: '2026-11-22T00:00:00.000Z',
    });
    const health = await fetchHealth('http://test');
    expect(health.status).toBe('ok');
    expect(fetch).toHaveBeenCalledWith('http://test/v1/health', expect.anything());
  });

  it('бросает ошибку, если сервер ответил ошибкой', async () => {
    mockFetch(500, {});
    await expect(fetchHealth('http://test')).rejects.toThrow('500');
  });

  it('бросает ошибку, если формат ответа не тот', async () => {
    mockFetch(200, { hello: 'world' });
    await expect(fetchHealth('http://test')).rejects.toThrow();
  });
});
