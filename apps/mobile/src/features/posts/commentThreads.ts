import type { Comment } from '@app/shared';

// Дерево комментариев. Сервер пока хранит комментарии плоским списком: без «ответа на» (parentId) и без лайков.
// Поэтому связь «ответ → комментарий» и лайки живут только в памяти приложения (после перезапуска ответы снова
// становятся обычными комментариями, лайки пропадают). Напарнику по бэкенду понадобится поле parentId у комментария
// и счётчик/отметка лайка — тогда эти заглушки заменяются данными сервера.

export type TreeNode = {
  comment: Comment;
  // Уровень на экране: 0 — комментарий, 1 — ответ, 2 — ответ на ответ; глубже уровни не растут
  depth: number;
  children: TreeNode[];
  // Кому на самом деле отвечают, если ответ «спрятан» на предельный уровень: перед текстом серым «@имя»
  mentionOf: Comment | null;
};

// Сколько ответов видно сразу; остальные — по «Показать ещё N ответов»
export const REPLIES_SHOWN = 2;
// Самый глубокий уровень на экране (0, 1, 2 — три уровня)
export const MAX_DEPTH = 2;

// Собирает дерево. Ответ, чей родитель удалён или ещё не загружен, показывается как обычный комментарий.
// Ответы глубже MAX_DEPTH не сдвигаются дальше: они встают на предельный уровень под своим предком первого уровня
export function buildTree(comments: readonly Comment[], parentOf: (commentId: string) => string | undefined): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const comment of comments) byId.set(comment.commentId, { comment, depth: 0, children: [], mentionOf: null });

  const roots: TreeNode[] = [];
  const parentNode = (node: TreeNode): TreeNode | undefined => {
    const id = parentOf(node.comment.commentId);
    return id ? byId.get(id) : undefined;
  };

  // Настоящая глубина (с защитой от петель)
  const trueDepth = (node: TreeNode): number => {
    let depth = 0;
    let current = parentNode(node);
    const seen = new Set<string>([node.comment.commentId]);
    while (current && !seen.has(current.comment.commentId)) {
      seen.add(current.comment.commentId);
      depth += 1;
      current = parentNode(current);
    }
    return depth;
  };

  for (const comment of comments) {
    const node = byId.get(comment.commentId) as TreeNode;
    let parent = parentNode(node);
    if (!parent || trueDepth(node) === 0) {
      roots.push(node);
      continue;
    }
    const depth = trueDepth(node);
    if (depth > MAX_DEPTH) {
      // Поднимаем до предка на глубине MAX_DEPTH − 1 и помним, кому отвечали на самом деле
      node.mentionOf = parent.comment;
      let up = parent;
      while (trueDepth(up) > MAX_DEPTH - 1) up = parentNode(up) ?? up;
      parent = up;
    }
    parent.children.push(node);
  }

  const setDepth = (node: TreeNode, depth: number) => {
    node.depth = depth;
    node.children.forEach((child) => setDepth(child, depth + 1));
  };
  roots.forEach((root) => setDepth(root, 0));
  return roots;
}

// Какие ответы показать и сколько скрыто
export function visibleReplies<T>(replies: readonly T[], expanded: boolean): { shown: T[]; hidden: number } {
  if (expanded || replies.length <= REPLIES_SHOWN) return { shown: [...replies], hidden: 0 };
  return { shown: replies.slice(0, REPLIES_SHOWN), hidden: replies.length - REPLIES_SHOWN };
}

const parents = new Map<string, string>();
const liked = new Set<string>();
const baseLikes = new Map<string, number>();

// Запоминает, на какой именно комментарий отвечают (сам, без «схлопывания» в корень)
export const rememberReply = (commentId: string, replyTo: string) => {
  parents.set(commentId, replyTo);
};
export const parentOfComment = (commentId: string) => parents.get(commentId);

export const isCommentLiked = (commentId: string) => liked.has(commentId);
export const toggleCommentLike = (commentId: string) => {
  if (!liked.delete(commentId)) liked.add(commentId);
};

// Сколько лайков у комментария: «настоящие» (пока только в тестовых данных) плюс мой
export const setBaseLikes = (commentId: string, count: number) => baseLikes.set(commentId, count);
export const likeCountOf = (commentId: string) => (baseLikes.get(commentId) ?? 0) + (liked.has(commentId) ? 1 : 0);

// Предки комментария от ближайшего вверх (нужны, чтобы раскрыть ветку, когда в ней появился новый ответ)
export function ancestorsOf(commentId: string): string[] {
  const out: string[] = [];
  let current = parents.get(commentId);
  while (current && !out.includes(current)) {
    out.push(current);
    current = parents.get(current);
  }
  return out;
}
