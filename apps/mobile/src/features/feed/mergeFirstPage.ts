import type { Post } from '@app/shared';

export type FeedPage = { posts: Post[]; nextCursor: string | null };

// Обновление при возврате на вкладку: свежая первая порция заменяет начало списка, а подгруженное ниже остаётся,
// чтобы прокрутка не прыгала. Если порции не пересеклись, список начинается заново
export function mergeFirstPage(current: FeedPage, fresh: FeedPage): FeedPage {
  const last = fresh.posts[fresh.posts.length - 1];
  const at = last ? current.posts.findIndex((post) => post.postId === last.postId) : -1;
  if (at === -1) return fresh;
  const seen = new Set(fresh.posts.map((post) => post.postId));
  const tail = current.posts.slice(at + 1).filter((post) => !seen.has(post.postId));
  return { posts: [...fresh.posts, ...tail], nextCursor: current.nextCursor };
}
