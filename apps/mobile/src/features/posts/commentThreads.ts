import type { Comment } from '@app/shared';

// Ветки комментариев. Сервер пока хранит комментарии плоским списком — без «ответа на» и без лайков.
// Поэтому связь «ответ → комментарий» и лайки комментариев живут только в памяти приложения:
// после перезапуска ответы снова показываются обычными комментариями, а лайки пропадают.

export type Thread = { comment: Comment; replies: Comment[] };

// Сколько ответов видно сразу; остальные — по «Показать ещё N ответов»
export const REPLIES_SHOWN = 2;

// Собирает ветки: ответы уходят под свой комментарий в порядке появления.
// Ответ, чей комментарий удалён или ещё не загружен, показывается как обычный комментарий.
export function buildThreads(comments: readonly Comment[], parentOf: (commentId: string) => string | undefined): Thread[] {
  const threads: Thread[] = [];
  const byRoot = new Map<string, Thread>();
  const ids = new Set(comments.map((comment) => comment.commentId));

  for (const comment of comments) {
    const parent = parentOf(comment.commentId);
    if (parent && ids.has(parent)) continue;
    const thread = { comment, replies: [] };
    threads.push(thread);
    byRoot.set(comment.commentId, thread);
  }
  for (const comment of comments) {
    const parent = parentOf(comment.commentId);
    if (parent && ids.has(parent)) byRoot.get(parent)?.replies.push(comment);
  }
  return threads;
}

// Какие ответы показать и сколько скрыто
export function visibleReplies(replies: readonly Comment[], expanded: boolean): { shown: Comment[]; hidden: number } {
  if (expanded || replies.length <= REPLIES_SHOWN) return { shown: [...replies], hidden: 0 };
  return { shown: replies.slice(0, REPLIES_SHOWN), hidden: replies.length - REPLIES_SHOWN };
}

const parents = new Map<string, string>();
const liked = new Set<string>();

// Ответ на ответ прикрепляется к тому же исходному комментарию: вложенность — один уровень
export const rememberReply = (commentId: string, replyTo: string) => {
  parents.set(commentId, parents.get(replyTo) ?? replyTo);
};
export const parentOfComment = (commentId: string) => parents.get(commentId);

export const isCommentLiked = (commentId: string) => liked.has(commentId);
export const toggleCommentLike = (commentId: string) => {
  if (!liked.delete(commentId)) liked.add(commentId);
};
