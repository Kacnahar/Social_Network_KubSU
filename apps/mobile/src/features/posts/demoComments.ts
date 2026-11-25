import type { Comment } from '@app/shared';
import { useCallback, useState } from 'react';
import { useSignedIn } from '../../lib/session';
import { rememberReply, setBaseLikes } from './commentThreads';

// ТЕСТОВЫЕ комментарии с несколькими уровнями ответов, чтобы видеть ветки (экран /comments-demo).
// Сервера для них нет: ответы и лайки живут только в памяти экрана. Поле parentId (на кого отвечают) и счётчик лайков
// у комментария должен будет добавить сервер — сейчас связь «ответ → комментарий» хранится в commentThreads.ts.

export const DEMO_POST_AUTHOR = 'demo-lisa';

const people = {
  artem: { profileId: 'demo-artem', displayName: 'dartanubius', avatarUrl: null, role: 'student' as const },
  lisa: { profileId: DEMO_POST_AUTHOR, displayName: 'lizok.da', avatarUrl: null, role: 'student' as const },
  irina: { profileId: 'demo-irina', displayName: 'iryn_vishnya', avatarUrl: null, role: 'student' as const },
  maria: { profileId: 'demo-maria', displayName: 'Мария Орлова', avatarUrl: null, role: 'student' as const },
  nikita: { profileId: 'demo-nikita', displayName: 'Никита Белов', avatarUrl: null, role: 'student' as const },
  sofya: { profileId: 'demo-sofya', displayName: 'Софья Лебедева', avatarUrl: null, role: 'student' as const },
};

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const make = (id: string, author: Comment['author'], text: string, ago: number, likes: number, parent?: string): Comment => {
  setBaseLikes(`demo-${id}`, likes);
  if (parent) rememberReply(`demo-${id}`, `demo-${parent}`);
  return { commentId: `demo-${id}`, author, text, createdAt: minutesAgo(ago), canDelete: false };
};

const build = (): Comment[] => [
  make('d1', people.artem, 'Роулинг, ты ли это???', 1020, 10),
  make('d2', people.lisa, 'нет, но позиция адекватная', 1010, 162, 'd1'),
  make('d3', people.irina, 'Так-то Роулинг крутая, так что это может быть только комплиментом.', 1000, 200, 'd1'),
  make('d4', people.lisa, 'кстати крутая не только как писательница, как общественница тоже)', 990, 20, 'd3'),
  make('d5', people.artem, 'Согласен, особенно про школы и образование. Это вообще отдельная большая тема', 980, 4, 'd4'),
  make('d6', people.maria, 'А я сначала думала, что это пародия', 900, 7, 'd1'),
  make('d7', people.nikita, 'Тоже так подумал, пока не прочитал до конца', 880, 2, 'd1'),
  make('d8', people.sofya, 'Кто-нибудь знает, когда выйдет продолжение? Очень жду, перечитала уже все предыдущие части и теперь не знаю, чем себя занять до выхода новой книги', 600, 3),
  make('d9', people.nikita, '+1, тоже жду', 590, 1, 'd8'),
];

// Тот же набор свойств, что у useComments, но без сервера
export function useDemoComments() {
  const { profile } = useSignedIn();
  const [comments, setComments] = useState<Comment[]>(build);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [lastAdded, setLastAdded] = useState<{ id: string; parentId: string | null } | null>(null);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (text === '' || !profile) return;
    const id = `demo-new-${Date.now()}`;
    const author = { profileId: profile.profileId, displayName: profile.displayName, avatarUrl: profile.avatarUrl, role: profile.role };
    if (replyTo) rememberReply(id, replyTo.commentId);
    setComments((current) => [...current, { commentId: id, author, text, createdAt: new Date().toISOString(), canDelete: false }]);
    setLastAdded({ id, parentId: replyTo ? replyTo.commentId : null });
    setDraft('');
    setReplyTo(null);
  }, [draft, profile, replyTo]);

  return {
    state: { status: 'ready' as const, comments, nextCursor: null },
    load: async () => undefined,
    loadMore: async () => undefined,
    loadingMore: false,
    moreError: null,
    draft,
    setDraft,
    replyTo,
    setReplyTo,
    send,
    sending: false,
    sendError: null,
    removed: (commentId: string) => setComments((current) => current.filter((comment) => comment.commentId !== commentId)),
    lastAdded,
  };
}
