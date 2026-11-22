import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStory, deleteStory, getStories, getStoryViewers, markStoryViewed } from './api';

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const author = { profileId: 'pr1', displayName: 'Аня', avatarUrl: null, role: 'student' };
const story = {
  storyId: 's1',
  photo: { url: '/v1/media/m1', width: 900, height: 1600 },
  caption: 'Привет',
  createdAt: '2026-11-22T10:00:00.000Z',
  expiresAt: '2026-11-23T10:00:00.000Z',
  viewedByMe: false,
  viewCount: null,
  canDelete: false,
};

describe('клиент API историй', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getStories запрашивает группы с токеном', async () => {
    const fetchMock = mockFetch({ groups: [{ author, isMine: false, hasUnseen: true, stories: [story] }] });
    const response = await getStories('tok');
    expect(response.groups[0]?.stories[0]?.storyId).toBe('s1');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/stories$/);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer tok' });
  });

  it('getStories отвергает ответ неверной формы', async () => {
    mockFetch({ groups: 'нет' });
    await expect(getStories('tok')).rejects.toBeInstanceOf(Error);
  });

  it('createStory отправляет фото и подпись', async () => {
    const fetchMock = mockFetch({ ok: true });
    await createStory('tok', { mediaId: '5b0d1c3e-8f5e-4c53-9a53-0a1f4a7d2b11', caption: 'Привет' });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/stories$/);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ mediaId: '5b0d1c3e-8f5e-4c53-9a53-0a1f4a7d2b11', caption: 'Привет' });
  });

  it('markStoryViewed отправляет POST на /view', async () => {
    const fetchMock = mockFetch({ ok: true });
    await markStoryViewed('tok', 's 1');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/stories\/s%201\/view$/);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
  });

  it('getStoryViewers возвращает посмотревших', async () => {
    const fetchMock = mockFetch({ viewers: [{ viewer: author, viewedAt: '2026-11-22T11:00:00.000Z' }] });
    const response = await getStoryViewers('tok', 's1');
    expect(response.viewers[0]?.viewer.displayName).toBe('Аня');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/stories\/s1\/viewers$/);
  });

  it('deleteStory отправляет DELETE', async () => {
    const fetchMock = mockFetch({ ok: true });
    await deleteStory('tok', 's1');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/stories\/s1$/);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE');
  });
});
