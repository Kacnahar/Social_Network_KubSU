import { describe, expect, it } from 'vitest';
import { buildIndex, highlight, parseQuery, searchAddresses, type AddressData } from './addressSearch';

const data: AddressData = {
  cities: ['Краснодар', 'Новая Адыгея'],
  streets: [
    ['ул. Ставропольская', 0, '', '1|2|14|14/1|14А|140|149'],
    ['ул. Красная', 0, '', '1|2|3'],
    ['ул. Красных Партизан', 0, '', '5|7'],
    ['пр-д 1-й им. Дежнёва', 0, '', '1|2'],
    ['ул. Красная', 1, '', '4|5'],
    ['ул. Красная', 0, 'тер. Учхоз Кубань', '9'],
    ['ул. 1 Линия', 1, '', ''],
  ],
};
const index = buildIndex(data);
const names = (query: string) => (searchAddresses(index, query) ?? []).map((item) => item.insert);

describe('подсказки адресов', () => {
  it('от двух букв; короче — списка нет', () => {
    expect(searchAddresses(index, 'с')).toBeNull();
    expect(searchAddresses(index, ' ')).toBeNull();
    expect(names('ст')).toEqual(['ул. Ставропольская, ']);
  });

  it('начало слова, любой регистр, «ул.» и «улица» не мешают', () => {
    expect(names('Ставроп')).toEqual(['ул. Ставропольская, ']);
    expect(names('СТАВРОП')).toEqual(['ул. Ставропольская, ']);
    expect(names('ул. ставроп')).toEqual(['ул. Ставропольская, ']);
    expect(names('улица Ставропольская')).toEqual(['ул. Ставропольская, ']);
  });

  it('«красн»: сначала улицы с таким первым словом, короткие раньше', () => {
    expect(names('красн')).toEqual(['ул. Красная, ', 'ул. Красная, ', 'ул. Красная, ', 'ул. Красных Партизан, ']);
  });

  it('«ё» и «е» — одно и то же', () => {
    expect(names('дежнев')).toEqual(['пр-д 1-й им. Дежнёва, ']);
    expect(names('дежнёв')).toEqual(['пр-д 1-й им. Дежнёва, ']);
  });

  it('несколько слов в любом порядке: «партизан красных»', () => {
    expect(names('партиз красных')).toEqual(['ул. Красных Партизан, ']);
  });

  it('улица и номер — подсказывает дома', () => {
    expect(names('Ставропольская 14')).toEqual(['ул. Ставропольская, 14', 'ул. Ставропольская, 14/1', 'ул. Ставропольская, 14А', 'ул. Ставропольская, 140', 'ул. Ставропольская, 149']);
    expect(names('ул. Ставропольская, 149')).toEqual(['ул. Ставропольская, 149']);
    expect(names('ставропольская 999')).toEqual([]);
  });

  it('«1-й» и «1 линия» — это название, а не номер дома', () => {
    expect(parseQuery('пр-д 1-й')).toEqual({ words: ['1-й'], house: null });
    expect(names('1 лин')).toEqual(['ул. 1 Линия, ']);
    expect(parseQuery('красная 5')).toEqual({ words: ['красная'], house: '5' });
  });

  it('Новая Адыгея: город справа и район известен; у улиц в СНТ справа ещё и территория', () => {
    const items = searchAddresses(index, 'красная 4') ?? [];
    expect(items.map((item) => [item.insert, item.right, item.district])).toEqual([['ул. Красная, 4', 'Новая Адыгея', 'adygea']]);
    const streets = searchAddresses(index, 'красная') ?? [];
    expect(streets.map((item) => item.right)).toEqual(['Краснодар', 'Новая Адыгея', 'тер. Учхоз Кубань · Краснодар']);
  });

  it('ничего не найдено — пустой список; не больше 8 подсказок', () => {
    expect(searchAddresses(index, 'яяя')).toEqual([]);
    const many: AddressData = { cities: ['К'], streets: Array.from({ length: 20 }, (_, i) => [`ул. Тестовая${i}`, 0, '', ''] as [string, number, string, string]) };
    expect((searchAddresses(buildIndex(many), 'тест') ?? []).length).toBe(8);
  });

  it('совпавшая часть выделена', () => {
    expect(highlight('ул. Ставропольская, 149', ['ставроп', '149'])).toEqual([
      { text: 'ул. ', bold: false },
      { text: 'Ставроп', bold: true },
      { text: 'ольская, ', bold: false },
      { text: '149', bold: true },
    ]);
    expect(highlight('пр-д им. Дежнёва', ['дежнев']).filter((part) => part.bold).map((part) => part.text)).toEqual(['Дежнёв']);
  });
});
