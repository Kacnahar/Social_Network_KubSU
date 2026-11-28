// GIF: запросы к нашему серверу. В каталог gifs.ru ходит только сервер — ключа в приложении нет.
import { gifsPageSchema, type GifsPage } from '@app/shared';
import { request } from '../../lib/api';

// Пустой запрос — популярные; иначе поиск. pos — «откуда продолжать» из предыдущего ответа (подгрузка при прокрутке)
export function fetchGifs(token: string, query: string, pos?: string | null): Promise<GifsPage> {
  const text = query.trim();
  const more = pos ? `pos=${encodeURIComponent(pos)}` : '';
  const path = text ? `/gifs/search?q=${encodeURIComponent(text)}${more ? `&${more}` : ''}` : `/gifs/trending${more ? `?${more}` : ''}`;
  return request(path, gifsPageSchema, { token });
}
