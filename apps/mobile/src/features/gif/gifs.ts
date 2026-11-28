import { gifSchema, type Gif as ServerGif } from '@app/shared';

// GIF для постов и комментариев. Настоящие приходят с нашего сервера (он берёт их в каталоге gifs.ru).
// Если на сервере нет ключа gifs.ru, при разработке окно выбора работает на тестовых плитках без картинок.

export type Gif = {
  // Идентификатор GIF в gifs.ru (у тестовых — t1, t2…)
  id: string;
  // Название есть только у тестовых плиток
  title?: string;
  // Адрес маленького превью для сетки (у тестовых пусто — рисуется плитка)
  previewUrl: string | null;
  // Адрес самого GIF
  url: string | null;
  width: number;
  height: number;
};

// GIF в том виде, в каком его принимает сервер; у тестовой плитки адресов нет — её отправить нельзя
export function toServerGif(gif: Gif | null): ServerGif | undefined {
  if (!gif) return undefined;
  const parsed = gifSchema.safeParse({ id: gif.id, previewUrl: gif.previewUrl, url: gif.url, width: gif.width, height: gif.height });
  return parsed.success ? parsed.data : undefined;
}

// Добавляет новую порцию к уже показанным, без повторов
export function appendGifs(current: readonly Gif[], more: readonly Gif[]): Gif[] {
  const known = new Set(current.map((gif) => gif.id));
  return [...current, ...more.filter((gif) => !known.has(gif.id))];
}

const test = (id: string, title: string, width: number, height: number): Gif => ({ id, title, previewUrl: null, url: null, width, height });

export const TEST_GIFS: readonly Gif[] = [
  test('t1', 'Привет', 200, 150),
  test('t2', 'Ура', 200, 200),
  test('t3', 'Смех', 200, 120),
  test('t4', 'Сессия', 200, 180),
  test('t5', 'Кофе', 200, 140),
  test('t6', 'Удивление', 200, 200),
  test('t7', 'Спасибо', 200, 130),
  test('t8', 'Аплодисменты', 200, 170),
];

// Тестовый поиск по названию
export const searchTestGifs = (query: string): Gif[] => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return TEST_GIFS.filter((gif) => words.every((word) => (gif.title ?? '').toLowerCase().includes(word)));
};

// Делит GIF на столбцы «в шахматном порядке» (первый — в первый, второй — во второй…), чтобы сетка была ровной
export function splitColumns<T>(items: readonly T[], columns: number): T[][] {
  const result: T[][] = Array.from({ length: columns }, () => []);
  items.forEach((item, index) => result[index % columns]?.push(item));
  return result;
}
