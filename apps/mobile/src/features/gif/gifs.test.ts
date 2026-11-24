import { describe, expect, it } from 'vitest';
import { parseGiphy } from './giphy';
import { searchTestGifs, splitColumns } from './gifs';

describe('GIF', () => {
  it('ищет тестовые GIF по названию', () => {
    expect(searchTestGifs('привет').map((gif) => gif.id)).toEqual(['t1']);
    expect(searchTestGifs('').length).toBe(8);
    expect(searchTestGifs('нет такого')).toEqual([]);
  });

  it('делит на столбцы по очереди', () => {
    expect(splitColumns([1, 2, 3, 4, 5], 2)).toEqual([[1, 3, 5], [2, 4]]);
  });

  it('разбирает ответ GIPHY и пропускает негодные записи', () => {
    const json = {
      data: [
        { id: 'a', title: 'Кот', images: { fixed_width_small: { url: 'https://x/s.gif', width: '100', height: '80' }, original: { url: 'https://x/o.gif' } } },
        { id: 'b', images: {} },
        { title: 'без id' },
      ],
    };
    expect(parseGiphy(json)).toEqual([{ id: 'a', title: 'Кот', previewUrl: 'https://x/s.gif', url: 'https://x/o.gif', width: 100, height: 80 }]);
    expect(parseGiphy(null)).toEqual([]);
  });
});
