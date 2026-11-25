// GIF для постов. Пока ключа GIPHY нет, окно выбора работает на тестовых плитках без картинок.

export type Gif = {
  id: string;
  title: string;
  // Адрес маленького превью для сетки (у тестовых пусто — рисуется плитка)
  previewUrl: string | null;
  // Адрес самого GIF
  url: string | null;
  width: number;
  height: number;
};

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
  return TEST_GIFS.filter((gif) => words.every((word) => gif.title.toLowerCase().includes(word)));
};

// Делит GIF на столбцы «в шахматном порядке» (первый — в первый, второй — во второй…), чтобы сетка была ровной
export function splitColumns<T>(items: readonly T[], columns: number): T[][] {
  const result: T[][] = Array.from({ length: columns }, () => []);
  items.forEach((item, index) => result[index % columns]?.push(item));
  return result;
}
