import { useSyncExternalStore } from 'react';
import type { Gif } from '../gif/gifs';

// GIF в комментариях. Сервер пока не умеет хранить GIF у комментария, поэтому выбранный GIF живёт только в памяти
// приложения (как ответы и лайки комментариев): после перезапуска комментарий останется с одним текстом.
// Если комментарий отправлен одним GIF, на сервер уходит служебный текст-заглушка GIF_PLACEHOLDER.
export const GIF_PLACEHOLDER = 'GIF';

const gifs = new Map<string, Gif>();
const listeners = new Set<() => void>();
let version = 0;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function rememberCommentGif(commentId: string, gif: Gif): void {
  gifs.set(commentId, gif);
  version += 1;
  listeners.forEach((listener) => listener());
}

export const commentGifOf = (commentId: string): Gif | null => gifs.get(commentId) ?? null;

// Текст, который показываем у комментария: у «GIF-заглушки» с прикреплённым GIF текста нет
export const visibleCommentText = (text: string, gif: Gif | null): string => (gif && text === GIF_PLACEHOLDER ? '' : text);

export function useCommentGif(commentId: string): Gif | null {
  useSyncExternalStore(subscribe, () => version, () => version);
  return commentGifOf(commentId);
}
