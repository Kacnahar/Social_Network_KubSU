import type { Gif } from './gifs';

// Официальный API GIPHY (REST). Ключ берётся только из переменной окружения EXPO_PUBLIC_GIPHY_KEY (файл .env, в git не попадает).
// Без ключа `hasGiphy` ложно, и окно выбора показывает тестовые GIF.
// ВАЖНО: переменные EXPO_PUBLIC_* попадают в сборку приложения, то есть ключ в приложении виден. Правильнее ходить в GIPHY
// через наш сервер (ключ на сервере, и телефон не передаёт GIPHY свой адрес) — см. описание задачи.
export const GIPHY_KEY: string | undefined = process.env.EXPO_PUBLIC_GIPHY_KEY || undefined;
export const hasGiphy = Boolean(GIPHY_KEY);

const BASE = 'https://api.giphy.com/v1/gifs';
const LIMIT = 24;

type GiphyImage = { url?: string; width?: string; height?: string };
type GiphyItem = { id?: string; title?: string; images?: { fixed_width?: GiphyImage; fixed_width_small?: GiphyImage; original?: GiphyImage } };

// Ответ GIPHY → наши GIF; негодные записи пропускаются
export function parseGiphy(json: unknown): Gif[] {
  const data = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  const result: Gif[] = [];
  for (const item of data as GiphyItem[]) {
    const small = item.images?.fixed_width_small ?? item.images?.fixed_width;
    const full = item.images?.original ?? item.images?.fixed_width;
    if (!item.id || !small?.url || !full?.url) continue;
    result.push({ id: item.id, title: item.title ?? '', previewUrl: small.url, url: full.url, width: Number(small.width) || 200, height: Number(small.height) || 200 });
  }
  return result;
}

// Популярные (пустой запрос) или результаты поиска. Только «безопасный» рейтинг g
export async function fetchGifs(query: string, signal?: AbortSignal): Promise<Gif[]> {
  if (!GIPHY_KEY) return [];
  const text = query.trim();
  const params = new URLSearchParams({ api_key: GIPHY_KEY, limit: String(LIMIT), rating: 'g', lang: 'ru' });
  if (text) params.set('q', text);
  const response = await fetch(`${BASE}/${text ? 'search' : 'trending'}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('Не получилось загрузить GIF');
  return parseGiphy(await response.json());
}
