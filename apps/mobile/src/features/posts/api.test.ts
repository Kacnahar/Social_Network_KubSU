import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getComments,
  getPost,
  getProfilePosts,
  likePost,
  reportComment,
  reportPost,
  unlikePost,
} from './api';

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const author = { profileId: 'pr1', displayName: 'Анна', avatarUrl: null, role: 'student' };
const post = {
  postId: 'p1',
  author,
  text: 'Привет',
  photos: [],
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  createdAt: '2026-11-22T10:00:00.000Z',
  canDelete: true,
};
const comment = { commentId: 'c1', author, text: 'Ок', createdAt: '2026-11-22T10:05:00.000Z', canDelete: false };

const call = (fetchMock: ReturnType<typeof mockFetch>) => ({
  url: String(fetchMock.mock.calls[0]?.[0]),
  init: fetchMock.mock.calls[0]?.[1],
});

describe('клиент API постов', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createPost отправляет текст и фото POST-ом', async () => {
    const fetchMock = mockFetch(post);
    await createPost('tok', { text: 'Привет', photoMediaIds: ['m1'] });
    const { url, init } = call(fetchMock);
    expect(url).toMatch(/\/v1\/posts$/);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ text: 'Привет', photoMediaIds: ['m1'] }));
    expect(init?.headers).toMatchObject({ authorization: 'Bearer tok' });
  });

  it('getPost запрашивает пост', async () => {
    const fetchMock = mockFetch(post);
    expect((await getPost('tok', 'p1')).postId).toBe('p1');
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/p1$/);
  });

  it('deletePost удаляет DELETE-ом', async () => {
    const fetchMock = mockFetch({ ok: true });
    await deletePost('tok', 'p1');
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/p1$/);
    expect(call(fetchMock).init?.method).toBe('DELETE');
  });

  it('likePost ставит лайк PUT-ом', async () => {
    const fetchMock = mockFetch({ likeCount: 1, likedByMe: true });
    expect(await likePost('tok', 'p1')).toEqual({ likeCount: 1, likedByMe: true });
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/p1\/like$/);
    expect(call(fetchMock).init?.method).toBe('PUT');
  });

  it('unlikePost снимает лайк DELETE-ом', async () => {
    const fetchMock = mockFetch({ likeCount: 0, likedByMe: false });
    await unlikePost('tok', 'p1');
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/p1\/like$/);
    expect(call(fetchMock).init?.method).toBe('DELETE');
  });

  it('getComments передаёт курсор в ?after=', async () => {
    const fetchMock = mockFetch({ comments: [comment], nextCursor: null });
    await getComments('tok', 'p1', 'abc def');
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/p1\/comments\?after=abc%20def$/);
  });

  it('getComments без курсора не добавляет параметр', async () => {
    const fetchMock = mockFetch({ comments: [], nextCursor: null });
    await getComments('tok', 'p1');
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/p1\/comments$/);
  });

  it('addComment отправляет текст POST-ом', async () => {
    const fetchMock = mockFetch(comment);
    await addComment('tok', 'p1', 'Ок');
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/p1\/comments$/);
    expect(call(fetchMock).init?.method).toBe('POST');
    expect(call(fetchMock).init?.body).toBe(JSON.stringify({ text: 'Ок' }));
  });

  it('deleteComment удаляет по адресу /posts/comments/:id', async () => {
    const fetchMock = mockFetch({ ok: true });
    await deleteComment('tok', 'c1');
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/comments\/c1$/);
    expect(call(fetchMock).init?.method).toBe('DELETE');
  });

  it('getProfilePosts передаёт курсор в ?before=', async () => {
    const fetchMock = mockFetch({ posts: [post], nextCursor: 'n' });
    const page = await getProfilePosts('tok', 'pr1', 'cur');
    expect(page.nextCursor).toBe('n');
    expect(call(fetchMock).url).toMatch(/\/v1\/profiles\/pr1\/posts\?before=cur$/);
  });

  it('reportPost отправляет причину', async () => {
    const fetchMock = mockFetch({ ok: true });
    await reportPost('tok', 'p1');
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/p1\/report$/);
    expect(call(fetchMock).init?.method).toBe('POST');
    expect(call(fetchMock).init?.body).toBe(JSON.stringify({ reason: '' }));
  });

  it('reportComment жалуется на комментарий', async () => {
    const fetchMock = mockFetch({ ok: true });
    await reportComment('tok', 'c1', 'спам');
    expect(call(fetchMock).url).toMatch(/\/v1\/posts\/comments\/c1\/report$/);
    expect(call(fetchMock).init?.body).toBe(JSON.stringify({ reason: 'спам' }));
  });
});
