import { describe, expect, it } from 'vitest';
import { joinName, plural, splitName } from './plural';

describe('plural', () => {
  const posts = (count: number) => plural(count, 'пост', 'поста', 'постов');
  it('подбирает форму по числу', () => {
    expect(posts(0)).toBe('постов');
    expect(posts(1)).toBe('пост');
    expect(posts(3)).toBe('поста');
    expect(posts(5)).toBe('постов');
    expect(posts(11)).toBe('постов');
    expect(posts(21)).toBe('пост');
    expect(posts(112)).toBe('постов');
  });
});

describe('имя и фамилия', () => {
  it('делит по первому пробелу', () => {
    expect(splitName('Анна Иванова')).toEqual({ firstName: 'Анна', lastName: 'Иванова' });
    expect(splitName('Сергей Ильич Петров')).toEqual({ firstName: 'Сергей', lastName: 'Ильич Петров' });
    expect(splitName('  Марк ')).toEqual({ firstName: 'Марк', lastName: '' });
  });

  it('склеивает обратно без лишних пробелов', () => {
    expect(joinName(' Анна ', ' Иванова ')).toBe('Анна Иванова');
    expect(joinName('Марк', '')).toBe('Марк');
  });
});
