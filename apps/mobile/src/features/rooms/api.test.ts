import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPersona, getSlots, joinRoom, leaveRoom } from './api';

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('клиент API комнат', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getPersona передаёт токен в заголовке', async () => {
    const fetchMock = mockFetch(200, { personaId: 'p1', nickname: null, nicknameChangeAvailableAt: null });
    await getPersona('secret-token');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/rooms\/me$/);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer secret-token' });
  });

  it('getSlots запрашивает расписание с токеном', async () => {
    const slot = { id: 's1', title: 'Вечер знакомств', startsAt: '2026-11-22T17:00:00.000Z', durationMinutes: 60, state: 'upcoming', joinable: false };
    const fetchMock = mockFetch(200, { slots: [slot] });
    const response = await getSlots('tok');
    expect(response.slots).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/rooms\/slots$/);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer tok' });
  });

  it('joinRoom входит в комнату POST-ом без тела и отдаёт данные для звука', async () => {
    const fetchMock = mockFetch(200, {
      roomId: 'r1',
      voiceUrl: 'wss://voice.test',
      voiceToken: 'vt',
      endsAt: '2026-11-22T18:00:00.000Z',
    });
    const response = await joinRoom('tok', 's1');
    expect(response.voiceToken).toBe('vt');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/rooms\/slots\/s1\/join$/);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer tok' });
  });

  it('joinRoom передаёт текст ошибки, если комната закрыта', async () => {
    mockFetch(409, { error: { code: 'room_not_open', message: 'Комната сейчас закрыта' } });
    await expect(joinRoom('tok', 's1')).rejects.toMatchObject({ code: 'room_not_open', message: 'Комната сейчас закрыта' });
  });

  it('leaveRoom выходит из комнаты POST-ом', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    await leaveRoom('tok', 'r1');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/rooms\/r1\/leave$/);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
  });
});
