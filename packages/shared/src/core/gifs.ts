import { z } from 'zod';

// GIF из каталога gifs.ru. Приложение ходит за ними только через наш сервер (`/v1/gifs/*`): ключ gifs.ru живёт на сервере.

// Сколько GIF в одной порции
export const GIFS_PAGE_SIZE = 24;
export const GIF_QUERY_MAX = 50;
// Серверы, с которых gifs.ru раздаёт картинки (список из их описания API)
const GIFS_RU_MEDIA_HOST = /^((media|cdn)\d{0,3}\.gifs\.ru|gifs\.obs\.ru-moscow-1\.hc\.sbercloud\.ru)$/;

// Картинки берём только с серверов gifs.ru: чужой адрес в пост или комментарий подставить нельзя
const gifUrlSchema = z
  .string()
  .max(600)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && GIFS_RU_MEDIA_HOST.test(url.hostname);
    } catch {
      return false;
    }
  }, 'Адрес GIF должен вести на gifs.ru');

export const gifSchema = z.object({
  // Идентификатор GIF в gifs.ru
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  // Маленькая версия — для сетки выбора и комментариев
  previewUrl: gifUrlSchema,
  // Полная версия — для поста
  url: gifUrlSchema,
  // Размеры в точках — чтобы показать с правильными пропорциями
  width: z.number().int().min(1).max(10000),
  height: z.number().int().min(1).max(10000),
});
export type Gif = z.infer<typeof gifSchema>;

export const gifsPageSchema = z.object({
  gifs: z.array(gifSchema),
  // Передать в ?pos=, чтобы получить следующую порцию; null — больше ничего нет
  next: z.string().nullable(),
});
export type GifsPage = z.infer<typeof gifsPageSchema>;

export const gifsSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(GIF_QUERY_MAX),
  pos: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,100}$/)
    .optional(),
});

export const gifsTrendingQuerySchema = gifsSearchQuerySchema.pick({ pos: true });
