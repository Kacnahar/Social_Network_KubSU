import type { Comment } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { buildThreads, isCommentLiked, parentOfComment, rememberReply, toggleCommentLike, visibleReplies } from './commentThreads';

const comment = (commentId: string): Comment => ({
  commentId,
  author: { profileId: 'p', displayName: 'Анна', avatarUrl: null, role: 'student' },
  text: commentId,
  createdAt: '2026-11-22T10:00:00.000Z',
  canDelete: false,
});

describe('buildThreads', () => {
  const list = ['a', 'b', 'c', 'd'].map(comment);

  it('без ответов — каждый комментарий сам по себе', () => {
    expect(buildThreads(list, () => undefined).map((thread) => thread.comment.commentId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ответы уходят под свой комментарий в порядке появления', () => {
    const parent: Record<string, string> = { b: 'a', d: 'a' };
    const threads = buildThreads(list, (id) => parent[id]);
    expect(threads.map((thread) => thread.comment.commentId)).toEqual(['a', 'c']);
    expect(threads[0]?.replies.map((reply) => reply.commentId)).toEqual(['b', 'd']);
  });

  it('ответ на удалённый комментарий показывается как обычный', () => {
    const threads = buildThreads(list, (id) => (id === 'b' ? 'нет-такого' : undefined));
    expect(threads.map((thread) => thread.comment.commentId)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('visibleReplies', () => {
  const replies = ['1', '2', '3', '4', '5'].map(comment);

  it('сразу показывает два ответа и считает скрытые', () => {
    const { shown, hidden } = visibleReplies(replies, false);
    expect(shown.map((reply) => reply.commentId)).toEqual(['1', '2']);
    expect(hidden).toBe(3);
  });

  it('после «Показать ещё» показывает все', () => {
    expect(visibleReplies(replies, true)).toEqual({ shown: replies, hidden: 0 });
  });

  it('два ответа и меньше не сворачивает', () => {
    expect(visibleReplies(replies.slice(0, 2), false).hidden).toBe(0);
  });
});

describe('память приложения', () => {
  it('ответ на ответ прикрепляется к исходному комментарию', () => {
    rememberReply('r1', 'root');
    rememberReply('r2', 'r1');
    expect(parentOfComment('r1')).toBe('root');
    expect(parentOfComment('r2')).toBe('root');
  });

  it('лайк комментария включается и выключается', () => {
    expect(isCommentLiked('x')).toBe(false);
    toggleCommentLike('x');
    expect(isCommentLiked('x')).toBe(true);
    toggleCommentLike('x');
    expect(isCommentLiked('x')).toBe(false);
  });
});
