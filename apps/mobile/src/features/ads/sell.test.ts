import { describe, expect, it } from 'vitest';
import { categoryLabel, ITEM_CATEGORIES, digitsOf, emptySellDraft, groupDigits, isSellReady, isSellTouched, movePhoto } from './sell';

describe('форма «Продать вещь»', () => {
  it('цена: только цифры и пробелы между тысячами', () => {
    expect(digitsOf('1 200 ₽')).toBe('1200');
    expect(digitsOf('007')).toBe('7');
    expect(digitsOf('12345678901')).toBe('123456789');
    expect(groupDigits('1200')).toBe('1 200');
    expect(groupDigits('1500000')).toBe('1 500 000');
    expect(groupDigits('950')).toBe('950');
  });

  it('«Опубликовать» ждёт название, цену или «Договорная» и категорию', () => {
    const draft = { ...emptySellDraft(), title: 'Лампа' };
    expect(isSellReady(draft)).toBe(false);
    expect(isSellReady({ ...draft, price: '700' })).toBe(false);
    expect(isSellReady({ ...draft, price: '700', category: 'home' })).toBe(true);
    expect(isSellReady({ ...draft, negotiable: true, category: 'home' })).toBe(true);
    expect(isSellReady({ ...draft, title: '  ', negotiable: true, category: 'home' })).toBe(false);
  });

  it('понимает, что форма начата', () => {
    expect(isSellTouched(emptySellDraft())).toBe(false);
    expect(isSellTouched({ ...emptySellDraft(), condition: 'used' })).toBe(true);
    expect(isSellTouched({ ...emptySellDraft(), place: 'dorm3' })).toBe(true);
    expect(isSellTouched({ ...emptySellDraft(), description: '  ' })).toBe(false);
  });

  it('переставляет фото', () => {
    expect(movePhoto(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(movePhoto(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(movePhoto(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
    expect(movePhoto(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });

  it('категории: у каждой 3–5 подкатегорий, кроме «Другого»', () => {
    expect(ITEM_CATEGORIES).toHaveLength(15);
    for (const item of ITEM_CATEGORIES) {
      if (item.value === 'other') expect(item.subs).toEqual([]);
      else expect(item.subs.length >= 3 && item.subs.length <= 5).toBe(true);
    }
  });

  it('подпись категории в строке', () => {
    expect(categoryLabel('electronics', '2')).toBe('Электроника · Фото и видео');
    expect(categoryLabel('other')).toBe('Другое');
    expect(categoryLabel(null)).toBeNull();
  });
});
