import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  banFromRooms,
  closeRoomReport,
  dismissPostReport,
  liftRoomsBan,
  listAdminLog,
  listPostReports,
  listRoomReports,
  removeReportedRecord,
} from './api';

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const call = (fetchMock: ReturnType<typeof mockFetch>) => ({
  url: String(fetchMock.mock.calls[0]?.[0]),
  init: fetchMock.mock.calls[0]?.[1],
});

const author = { profileId: 'pr1', displayName: 'Анна', avatarUrl: null, role: 'student' };
const postReport = {
  reportId: 'r1',
  targetType: 'post',
  reason: 'спам',
  status: 'new',
  resolution: null,
  createdAt: '2026-11-22T10:00:00.000Z',
  reporter: author,
  target: { author, text: 'Привет', photos: [], createdAt: '2026-11-22T09:00:00.000Z' },
  reportsOnTarget: 2,
};
const roomReport = {
  reportId: 'q1',
  text: 'грубит',
  status: 'new',
  createdAt: '2026-11-22T10:00:00.000Z',
  reporter: { personaId: 'a', nickname: 'Лиса' },
  target: { personaId: 'b', nickname: null, blockedUntil: null },
};

describe('клиент API админки', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listPostReports просит жалобы нужного статуса и отдаёт список', async () => {
    const fetchMock = mockFetch({ reports: [postReport] });
    const reports = await listPostReports('tok', 'new');
    expect(reports[0]?.reportId).toBe('r1');
    expect(call(fetchMock).url).toMatch(/\/v1\/admin\/reports\/posts\?status=new$/);
    expect(call(fetchMock).init?.headers).toMatchObject({ authorization: 'Bearer tok' });
  });

  it('dismissPostReport отклоняет жалобу POST-ом', async () => {
    const fetchMock = mockFetch({ ok: true });
    await dismissPostReport('tok', 'r1');
    expect(call(fetchMock).url).toMatch(/\/v1\/admin\/reports\/posts\/r1\/dismiss$/);
    expect(call(fetchMock).init?.method).toBe('POST');
  });

  it('removeReportedRecord удаляет запись POST-ом', async () => {
    const fetchMock = mockFetch({ ok: true });
    await removeReportedRecord('tok', 'r1');
    expect(call(fetchMock).url).toMatch(/\/v1\/admin\/reports\/posts\/r1\/remove$/);
    expect(call(fetchMock).init?.method).toBe('POST');
  });

  it('listRoomReports просит жалобы комнат', async () => {
    const fetchMock = mockFetch({ reports: [roomReport] });
    const reports = await listRoomReports('tok', 'closed');
    expect(reports[0]?.text).toBe('грубит');
    expect(call(fetchMock).url).toMatch(/\/v1\/admin\/reports\/rooms\?status=closed$/);
  });

  it('closeRoomReport закрывает жалобу POST-ом', async () => {
    const fetchMock = mockFetch({ ok: true });
    await closeRoomReport('tok', 'q1');
    expect(call(fetchMock).url).toMatch(/\/v1\/admin\/reports\/rooms\/q1\/close$/);
    expect(call(fetchMock).init?.method).toBe('POST');
  });

  it('banFromRooms отправляет срок PUT-ом', async () => {
    const fetchMock = mockFetch({ ok: true });
    await banFromRooms('tok', 'b', 7);
    expect(call(fetchMock).url).toMatch(/\/v1\/admin\/rooms\/personas\/b\/ban$/);
    expect(call(fetchMock).init?.method).toBe('PUT');
    expect(call(fetchMock).init?.body).toBe(JSON.stringify({ days: 7 }));
  });

  it('liftRoomsBan снимает запрет DELETE-ом', async () => {
    const fetchMock = mockFetch({ ok: true });
    await liftRoomsBan('tok', 'b');
    expect(call(fetchMock).url).toMatch(/\/v1\/admin\/rooms\/personas\/b\/ban$/);
    expect(call(fetchMock).init?.method).toBe('DELETE');
  });

  it('listAdminLog отдаёт записи журнала', async () => {
    const fetchMock = mockFetch({
      entries: [{ entryId: 'e1', action: 'post_removed', note: null, adminLabel: 'Админ 1', byMe: true, createdAt: '2026-11-22T10:00:00.000Z' }],
    });
    const entries = await listAdminLog('tok');
    expect(entries[0]?.action).toBe('post_removed');
    expect(call(fetchMock).url).toMatch(/\/v1\/admin\/log$/);
  });

  it('403 приходит ошибкой forbidden с русским текстом', async () => {
    mockFetch({ error: { code: 'forbidden', message: 'Нет доступа' } }, 403);
    await expect(listAdminLog('tok')).rejects.toMatchObject({ code: 'forbidden', message: 'Нет доступа' });
  });
});
