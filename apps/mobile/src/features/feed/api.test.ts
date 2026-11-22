import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFeed } from './api';

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const post = {
  postId: 'p1',
  author: { profileId: 'pr1', displayName: 'Анна', avatarUrl: null, role: 'student' },
  text: 'Привет',
  photos: [],
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  createdAt: '2026-11-22T10:00:00.000Z',
  canDelete: false,
};

describe('клиент API ленты', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getFeed без курсора запрашивает первую порцию с токеном', async () => {
    const fetchMock = mockFetch({ posts: [post], nextCursor: 'n1' });
    const page = await getFeed('tok');
    expect(page.nextCursor).toBe('n1');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/feed$/);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer tok' });
  });

  it('getFeed передаёт курсор в ?before=', async () => {
    const fetchMock = mockFetch({ posts: [], nextCursor: null });
    await getFeed('tok', 'a b');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/feed\?before=a%20b$/);
  });

  it('getFeed отвергает ответ неверной формы', async () => {
    mockFetch({ posts: 'нет' });
    await expect(getFeed('tok')).rejects.toBeInstanceOf(Error);
  });
});
