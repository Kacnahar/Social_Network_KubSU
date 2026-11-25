import { describe, expect, it } from 'vitest';
import { categoryOfAd, emptyAdDraft, filterAds, filterByCategory, formatAdPrice, formatPrice, isSection, kindOptions, priceOf, validateAdDraft, type Ad, type AdDraft } from './ads';

const ad = (patch: Partial<Ad>): Ad => ({
  adId: 'a',
  section: 'ads',
  kind: 'sell',
  title: 'Велосипед',
  description: 'Почти новый',
  price: 500,
  district: null,
  rentTerm: null,
  photos: [],
  author: { profileId: null, displayName: 'Анна', avatarUrl: null },
  createdAt: '2026-11-22T10:00:00.000Z',
  ...patch,
});

const ads = [
  ad({ adId: '1', section: 'ads', kind: 'sell', title: 'Велосипед городской', description: 'Один сезон' }),
  ad({ adId: '2', section: 'ads', kind: 'buy', title: 'Куплю ноутбук', description: 'Для учёбы' }),
  ad({ adId: '3', section: 'ads', kind: 'rent', title: 'Комната у корпуса', description: 'Первый этаж', district: 'Центр', rentTerm: 'monthly' }),
  ad({ adId: '4', section: 'books', kind: 'give', title: 'Учебник по матанализу', description: 'Первый курс' }),
  ad({ adId: '5', section: 'services', kind: null, title: 'Репетитор по английскому', description: 'Готовлю к экзамену' }),
];

describe('filterAds', () => {
  it('без условий показывает всё', () => {
    expect(filterAds(ads, null, null, '').map((item) => item.adId)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('фильтрует по разделу и типу', () => {
    expect(filterAds(ads, 'ads', null, '').map((item) => item.adId)).toEqual(['1', '2', '3']);
    expect(filterAds(ads, 'ads', 'rent', '').map((item) => item.adId)).toEqual(['3']);
    expect(filterAds(ads, 'books', 'sell', '')).toEqual([]);
  });

  it('ищет по названию, описанию и району без учёта регистра', () => {
    expect(filterAds(ads, null, null, 'ПЕРВЫЙ').map((item) => item.adId)).toEqual(['3', '4']);
    expect(filterAds(ads, null, null, 'центр').map((item) => item.adId)).toEqual(['3']);
  });

  it('требует все слова запроса', () => {
    expect(filterAds(ads, null, null, 'комната этаж').map((item) => item.adId)).toEqual(['3']);
    expect(filterAds(ads, null, null, 'комната экзамен')).toEqual([]);
  });
});

describe('разделы и типы', () => {
  it('у объявлений три типа, у книг три других, у услуг и вакансий нет', () => {
    expect(kindOptions('ads').map((option) => option.label)).toEqual(['Купить', 'Продать', 'Аренда жилья']);
    expect(kindOptions('books').map((option) => option.label)).toEqual(['Продать', 'Отдать', 'Обменять']);
    expect(kindOptions('services')).toEqual([]);
    expect(kindOptions('jobs')).toEqual([]);
  });

  it('узнаёт настоящие разделы', () => {
    expect(isSection('books')).toBe(true);
    expect(isSection('schedule')).toBe(false);
    expect(isSection(undefined)).toBe(false);
  });
});

describe('цена', () => {
  it('разделяет тысячи и добавляет знак рубля', () => {
    expect(formatPrice(500)).toBe('500 ₽');
    expect(formatPrice(1250000)).toBe('1 250 000 ₽');
    expect(formatPrice(null)).toBe('Договорная');
  });

  it('у аренды дописывает срок', () => {
    expect(formatAdPrice({ price: 14000, kind: 'rent', rentTerm: 'monthly' })).toBe('14 000 ₽ / мес.');
    expect(formatAdPrice({ price: 1500, kind: 'rent', rentTerm: 'daily' })).toBe('1 500 ₽ / сутки');
    expect(formatAdPrice({ price: 500, kind: 'sell', rentTerm: null })).toBe('500 ₽');
  });

  it('у того, что отдают, пишет «Бесплатно»', () => {
    expect(formatAdPrice({ price: null, kind: 'give', rentTerm: null })).toBe('Бесплатно');
  });
});

describe('validateAdDraft', () => {
  const good: AdDraft = { ...emptyAdDraft('ads'), kind: 'sell', title: 'Велосипед', description: 'Почти новый', price: '500' };

  it('принимает заполненное объявление', () => {
    expect(validateAdDraft(good)).toEqual({});
    expect(priceOf(good)).toBe(500);
  });

  it('требует тип, название, описание и цену', () => {
    expect(Object.keys(validateAdDraft(emptyAdDraft('ads'))).sort()).toEqual(['description', 'kind', 'price', 'title']);
  });

  it('у услуг тип не нужен', () => {
    const draft = { ...emptyAdDraft('services'), title: 'Репетитор', description: 'Английский', price: '600' };
    expect(validateAdDraft(draft)).toEqual({});
  });

  it('не требует цену, когда она договорная', () => {
    const draft = { ...good, price: '', negotiable: true };
    expect(validateAdDraft(draft)).toEqual({});
    expect(priceOf(draft)).toBeNull();
  });

  it('не пропускает нецифры и ноль в цене', () => {
    expect(validateAdDraft({ ...good, price: '5 сотен' }).price).toBe('Только цифры');
    expect(validateAdDraft({ ...good, price: '0' }).price).toBe('Цена больше нуля');
  });

  it('книгу отдают без цены', () => {
    const give: AdDraft = { ...emptyAdDraft('books'), kind: 'give', title: 'Учебник', description: 'Отдам' };
    expect(validateAdDraft(give)).toEqual({});
    expect(priceOf(give)).toBeNull();
  });

  it('аренда требует район и цену, «договорной» не бывает', () => {
    const rent: AdDraft = { ...good, kind: 'rent', negotiable: true, price: '' };
    expect(Object.keys(validateAdDraft(rent)).sort()).toEqual(['district', 'price']);
    const filled = { ...rent, district: 'Центр', price: '14000' };
    expect(validateAdDraft(filled)).toEqual({});
    expect(priceOf(filled)).toBe(14000);
  });
});

describe('категории «Объявлений»', () => {
  it('определяет категорию: тип объявления, услуги или вакансии; книги — без категории', () => {
    expect(categoryOfAd(ads[0]!)).toBe('sell');
    expect(categoryOfAd(ads[3]!)).toBeNull();
    expect(categoryOfAd(ads[4]!)).toBe('services');
    expect(categoryOfAd(ad({ section: 'jobs', kind: null }))).toBe('jobs');
  });

  it('без категории показывает всё, кроме книг; с категорией — только её', () => {
    expect(filterByCategory(ads, null, '').map((item) => item.adId)).toEqual(['1', '2', '3', '5']);
    expect(filterByCategory(ads, 'rent', '').map((item) => item.adId)).toEqual(['3']);
    expect(filterByCategory(ads, 'services', '').map((item) => item.adId)).toEqual(['5']);
    expect(filterByCategory(ads, null, 'учебник')).toEqual([]);
  });
});
