// Обращение к каталогу gifs.ru от имени нашего сервера. Ключ и временный токен gifs.ru не покидают сервер:
// их нет ни в ответах, ни в журнале. Источник GIF подменяется через интерфейс `GifProvider` (в тестах — подделка).
// Описание API gifs.ru: https://api.gifs.ru/api/swagger

import { GIFS_PAGE_SIZE, gifSchema, type Gif, type GifsPage } from '@app/shared';

export interface GifProvider {
  // Популярные GIF; pos — «откуда продолжать» из предыдущего ответа
  trending(pos?: string): Promise<GifsPage>;
  // Поиск по словам
  search(query: string, pos?: string): Promise<GifsPage>;
}

const GIFS_RU_BASE = 'https://api.gifs.ru/api/v2';
const TIMEOUT_MS = 5000;
// Просим только нужные версии: маленькую (высота 300), среднюю (высота 500) и оригинал
const MEDIA_FILTER = 'tinygif,mediumgif,gif';
// Временный токен gifs.ru живёт 8 часов; обновляем заранее
const TOKEN_REFRESH_BEFORE_MS = 5 * 60_000;
const TOKEN_FALLBACK_TTL_MS = 60 * 60_000;

type MediaObject = { url?: unknown; dims?: unknown };
type ResultItem = { id?: unknown; media_formats?: Record<string, MediaObject | undefined> };

const sizeOf = (media: MediaObject | undefined): { url: string; width: number; height: number } | null => {
  if (!media || typeof media.url !== 'string' || !Array.isArray(media.dims)) return null;
  const [width, height] = media.dims as unknown[];
  if (!Number.isInteger(width) || !Number.isInteger(height) || (width as number) < 1 || (height as number) < 1) return null;
  return { url: media.url, width: width as number, height: height as number };
};

// «Оригинал» у gifs.ru иногда оказывается видео — как картинку его показать нельзя
const imageOnly = (media: ReturnType<typeof sizeOf>) => (media && /\.(gif|webp)$/i.test(new URL(media.url).pathname) ? media : null);
const safeImage = (media: MediaObject | undefined) => {
  try {
    return imageOnly(sizeOf(media));
  } catch {
    return null;
  }
};

// Ответ gifs.ru → только то, что нужно приложению. Негодные записи пропускаются
export function parseGifsRuPage(json: unknown): GifsPage {
  const body = json as { results?: unknown; next?: unknown } | null;
  if (!body || !Array.isArray(body.results)) throw new Error('gifs.ru ответил непонятно');

  const gifs: Gif[] = [];
  const seen = new Set<string>();
  for (const item of body.results as ResultItem[]) {
    const formats = item?.media_formats;
    const preview = safeImage(formats?.tinygif);
    const full = safeImage(formats?.mediumgif) ?? safeImage(formats?.gif) ?? preview;
    if (!preview || !full) continue;
    const parsed = gifSchema.safeParse({ id: String(item.id ?? ''), previewUrl: preview.url, url: full.url, width: full.width, height: full.height });
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    gifs.push(parsed.data);
  }

  const next = typeof body.next === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(body.next) && body.results.length > 0 ? body.next : null;
  return { gifs, next };
}

// Срок жизни токена записан в нём самом (поле exp, секунды)
function tokenExpiry(token: string, now: number): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: unknown };
    if (typeof payload.exp === 'number') return payload.exp * 1000;
  } catch {
    // токен непривычного вида — считаем, что живёт час
  }
  return now + TOKEN_FALLBACK_TTL_MS;
}

export function createGifsRuProvider(apiKey: string, fetchImpl: typeof fetch = fetch): GifProvider {
  let session: { token: string; expiresAt: number } | null = null;
  let pending: Promise<string> | null = null;

  // Саму ошибку сети не пробрасываем: в ней могут оказаться ключ или токен
  const call = async (url: string, init: RequestInit): Promise<Response> => {
    try {
      return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new Error('gifs.ru не отвечает');
    }
  };

  // Постоянный ключ меняется на временный токен; с ним идут остальные запросы
  const login = async (): Promise<string> => {
    const response = await call(`${GIFS_RU_BASE}/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: apiKey }),
    });
    if (!response.ok) throw new Error(`gifs.ru не принял ключ (код ${response.status})`);
    const body = (await response.json().catch(() => null)) as { token?: unknown } | null;
    if (!body || typeof body.token !== 'string' || body.token === '') throw new Error('gifs.ru не выдал токен');
    session = { token: body.token, expiresAt: tokenExpiry(body.token, Date.now()) };
    return body.token;
  };

  const tokenOf = async (): Promise<string> => {
    if (session && session.expiresAt - TOKEN_REFRESH_BEFORE_MS > Date.now()) return session.token;
    // Одновременные запросы ждут один и тот же вход
    pending ??= login().finally(() => {
      pending = null;
    });
    return pending;
  };

  const load = async (endpoint: 'featured' | 'search', params: Record<string, string>, pos: string | undefined): Promise<GifsPage> => {
    const query = new URLSearchParams({ ...params, limit: String(GIFS_PAGE_SIZE), media_filter: MEDIA_FILTER });
    if (pos) query.set('pos', pos);
    const url = `${GIFS_RU_BASE}/${endpoint}?${query.toString()}`;
    let response = await call(url, { headers: { authorization: `Bearer ${await tokenOf()}` } });
    if (response.status === 401) {
      // Токен устарел раньше срока — получаем новый и повторяем один раз
      session = null;
      response = await call(url, { headers: { authorization: `Bearer ${await tokenOf()}` } });
    }
    if (!response.ok) throw new Error(`gifs.ru ответил с кодом ${response.status}`);
    return parseGifsRuPage(await response.json().catch(() => null));
  };

  return {
    trending: (pos) => load('featured', {}, pos),
    search: (text, pos) => load('search', { q: text }, pos),
  };
}
