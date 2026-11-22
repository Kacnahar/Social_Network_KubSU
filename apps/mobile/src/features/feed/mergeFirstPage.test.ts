import type { Post } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { mergeFirstPage } from './mergeFirstPage';

const post = (postId: string): Post => ({
  postId,
  author: { profileId: 'pr1', displayName: 'Анна', avatarUrl: null, role: 'student' },
  text: postId,
  photos: [],
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  createdAt: '2026-11-22T10:00:00.000Z',
  canDelete: false,
});
const ids = (posts: Post[]) => posts.map((p) => p.postId);

describe('mergeFirstPage', () => {
  it('подгруженный хвост и его курсор сохраняются, новый пост появляется сверху', () => {
    const current = { posts: [post('b'), post('c'), post('d'), post('e')], nextCursor: 'cur' };
    const fresh = { posts: [post('a'), post('b'), post('c')], nextCursor: 'other' };
    const merged = mergeFirstPage(current, fresh);
    expect(ids(merged.posts)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(merged.nextCursor).toBe('cur');
  });

  it('удалённый пост из первой порции пропадает', () => {
    const current = { posts: [post('a'), post('b'), post('c'), post('d')], nextCursor: null };
    const fresh = { posts: [post('a'), post('c')], nextCursor: null };
    expect(ids(mergeFirstPage(current, fresh).posts)).toEqual(['a', 'c', 'd']);
  });

  it('порции не пересеклись — список начинается заново', () => {
    const current = { posts: [post('x'), post('y')], nextCursor: 'cur' };
    const fresh = { posts: [post('a'), post('b')], nextCursor: 'n' };
    expect(mergeFirstPage(current, fresh)).toEqual(fresh);
  });

  it('пустая свежая порция очищает список', () => {
    const fresh = { posts: [], nextCursor: null };
    expect(mergeFirstPage({ posts: [post('a')], nextCursor: null }, fresh)).toEqual(fresh);
  });
});
