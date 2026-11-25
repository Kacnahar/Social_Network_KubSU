import type { Comment } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { ancestorsOf, buildTree, isCommentLiked, likeCountOf, parentOfComment, rememberReply, setBaseLikes, toggleCommentLike, visibleReplies, type TreeNode } from './commentThreads';

const comment = (commentId: string): Comment => ({
  commentId,
  author: { profileId: 'p', displayName: 'Анна', avatarUrl: null, role: 'student' },
  text: commentId,
  createdAt: '2026-11-22T10:00:00.000Z',
  canDelete: false,
});

const ids = (nodes: TreeNode[]) => nodes.map((node) => node.comment.commentId);

describe('buildTree', () => {
  const list = ['a', 'b', 'c', 'd'].map(comment);

  it('без ответов — каждый комментарий сам по себе', () => {
    expect(ids(buildTree(list, () => undefined))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ответы уходят под свой комментарий в порядке появления', () => {
    const parent: Record<string, string> = { b: 'a', d: 'a' };
    const tree = buildTree(list, (id) => parent[id]);
    expect(ids(tree)).toEqual(['a', 'c']);
    expect(ids(tree[0]?.children ?? [])).toEqual(['b', 'd']);
    expect(tree[0]?.children[0]?.depth).toBe(1);
  });

  it('ответ на ответ — второй уровень; ответ на удалённый показывается как обычный', () => {
    const parent: Record<string, string> = { b: 'a', c: 'b', d: 'нет-такого' };
    const tree = buildTree(list, (id) => parent[id]);
    expect(ids(tree)).toEqual(['a', 'd']);
    expect(tree[0]?.children[0]?.children[0]?.comment.commentId).toBe('c');
    expect(tree[0]?.children[0]?.children[0]?.depth).toBe(2);
    expect(tree[0]?.children[0]?.children[0]?.mentionOf).toBeNull();
  });

  it('глубже трёх уровней не сдвигается, а помнит, кому отвечали', () => {
    const deep = ['a', 'b', 'c', 'd', 'e'].map(comment);
    const parent: Record<string, string> = { b: 'a', c: 'b', d: 'c', e: 'd' };
    const tree = buildTree(deep, (id) => parent[id]);
    const level1 = tree[0]?.children[0];
    expect(ids(level1?.children ?? [])).toEqual(['c', 'd', 'e']);
    const d = level1?.children[1];
    expect(d?.depth).toBe(2);
    expect(d?.mentionOf?.commentId).toBe('c');
    expect(level1?.children[2]?.mentionOf?.commentId).toBe('d');
  });
});

describe('visibleReplies', () => {
  const replies = ['1', '2', '3', '4', '5'];

  it('сразу показывает два ответа и считает скрытые', () => {
    const { shown, hidden } = visibleReplies(replies, false);
    expect(shown).toEqual(['1', '2']);
    expect(hidden).toBe(3);
  });

  it('раскрытые — все; два и меньше — без «ещё»', () => {
    expect(visibleReplies(replies, true).shown).toHaveLength(5);
    expect(visibleReplies(['1', '2'], false).hidden).toBe(0);
  });
});

describe('ответы и лайки в памяти', () => {
  it('помнит прямого родителя и цепочку предков', () => {
    rememberReply('r1', 'a');
    rememberReply('r2', 'r1');
    expect(parentOfComment('r2')).toBe('r1');
    expect(ancestorsOf('r2')).toEqual(['r1', 'a']);
  });

  it('лайк переключается и входит в счётчик', () => {
    setBaseLikes('z', 4);
    expect(likeCountOf('z')).toBe(4);
    toggleCommentLike('z');
    expect(isCommentLiked('z')).toBe(true);
    expect(likeCountOf('z')).toBe(5);
    toggleCommentLike('z');
    expect(likeCountOf('z')).toBe(4);
  });
});
