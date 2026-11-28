import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGifs } from './api';
import { appendGifs, searchTestGifs, splitColumns, toServerGif, type Gif } from './gifs';

const real: Gif = { id: 'a', previewUrl: 'https://media1.gifs.ru/a_300.webp', url: 'https://media1.gifs.ru/a_500.webp', width: 889, height: 500 };

describe('GIF', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ищет тестовые GIF по названию', () => {
    expect(searchTestGifs('привет').map((gif) => gif.id)).toEqual(['t1']);
    expect(searchTestGifs('').length).toBe(8);
    expect(searchTestGifs('нет такого')).toEqual([]);
  });

  it('делит на столбцы по очереди', () => {
    expect(splitColumns([1, 2, 3, 4, 5], 2)).toEqual([[1, 3, 5], [2, 4]]);
  });

  it('на сервер уходит только настоящий GIF с адресами gifs.ru', () => {
    expect(toServerGif(real)).toEqual(real);
    expect(toServerGif({ ...real, title: 'Кот' })).toEqual(real);
    expect(toServerGif(searchTestGifs('привет')[0]!)).toBeUndefined();
    expect(toServerGif({ ...real, url: 'https://example.com/x.gif' })).toBeUndefined();
    expect(toServerGif(null)).toBeUndefined();
  });

  it('подгруженная порция добавляется без повторов', () => {
    const second = { ...real, id: 'b' };
    expect(appendGifs([real], [real, second]).map((gif) => gif.id)).toEqual(['a', 'b']);
  });

  it('ходит за GIF на наш сервер, а не в gifs.ru напрямую', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ gifs: [real], next: '24' })));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchGifs('token', '')).toEqual({ gifs: [real], next: '24' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/v1\/gifs\/trending$/);
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>).authorization).toBe('Bearer token');

    await fetchGifs('token', ' привет мир ', '24');
    const url = String(fetchMock.mock.calls[1]?.[0]);
    expect(url).toContain(`/v1/gifs/search?q=${encodeURIComponent('привет мир')}&pos=24`);
    expect(url).not.toContain('gifs.ru');
  });
});
