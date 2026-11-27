import { describe, expect, it } from 'vitest';
import { adsCountText, buildAdView, sinceText, typeOfAd } from './adDetail';
import { testAdsForPage } from './testAds';
import type { Ad } from './ads';

const now = new Date();
const ads = testAdsForPage();
const get = (id: string): Ad => ads.find((ad) => ad.adId === id) as Ad;

describe('страница объявления', () => {
  it('определяет тип', () => {
    expect(ads.map((ad) => typeOfAd(ad))).toEqual(['item', 'item', 'rent', 'rent', 'service', 'service', 'job', 'job']);
  });

  it('вещь: «Торг», категория и состояние; у минимального только то, что есть', () => {
    const full = buildAdView(get('d-item-full'), now);
    expect(full.tag).toBe('Торг');
    expect(full.price).toContain('900');
    expect(full.specs.map((item) => item.label)).toEqual(['Категория', 'Состояние', 'Место встречи']);
    expect(full.specs[1]).toEqual({ label: 'Состояние', value: 'Б/У' });
    // В строке под названием только район и время публикации, без просмотров
    expect(full.meta).not.toContain('просмотр');
    const min = buildAdView(get('d-item-min'), now);
    expect(min.tag).toBeNull();
    expect(min.price).toBe('Договорная');
    expect(min.specs).toEqual([]);
  });

  it('жильё: значки, характеристики, удобства и адрес', () => {
    const full = buildAdView(get('d-rent-full'), now);
    expect(full.homeStats).toEqual(['2 комн.', '45 м²', '3/9 этаж']);
    expect(full.specs.map((item) => item.label)).toEqual(['Тип', 'Срок', 'Залог', 'Коммунальные услуги', 'С кем', 'Животные', 'Курение', 'До университета']);
    expect(full.specs.find((item) => item.label === 'Животные')?.value).toBe('Нельзя');
    expect(full.amenities.map((item) => item.label)).toEqual(['Мебель', 'Wi-Fi', 'Стиральная машина', 'Холодильник', 'Кондиционер']);
    expect(full.address).toBe('ул. Ставропольская, 149');
    expect(full.price).toContain('мес.');
    const min = buildAdView(get('d-rent-min'), now);
    expect(min.homeStats).toEqual([]);
    expect(min.specs.map((item) => item.label)).toEqual(['Тип', 'Срок']);
    expect(min.amenities).toEqual([]);
  });

  it('услуга: характеристики без «Не указать»', () => {
    const full = buildAdView(get('d-service-full'), now);
    expect(full.specs.map((item) => item.label)).toEqual(['Категория', 'Для кого', 'Формат', 'Район', 'Опыт', 'Когда удобно']);
    expect(full.price).toBe('600 ₽ / час');
    const min = buildAdView(get('d-service-min'), now);
    expect(min.specs.map((item) => item.label)).toEqual(['Категория', 'Формат']);
    expect(min.price).toBe('Договорная');
  });

  it('вакансия: зарплата, компания, метки; кнопка «Откликнуться»', () => {
    const full = buildAdView(get('d-job-full'), now);
    expect(full.price).toBe('30 000–45 000 ₽ / мес.');
    expect(full.company).toBe('Кофейня «Перемена»');
    expect(full.badges).toEqual(['Частичная', 'Подработка', 'В офисе', 'Можно совмещать с учёбой']);
    expect(full.specs.map((item) => item.label)).toEqual(['Сфера', 'График', 'Опыт', 'Оформление']);
    expect(full.address).toBe('ул. Красная, 120');
    expect(full.actionLabel).toBe('Откликнуться');
    const min = buildAdView(get('d-job-min'), now);
    expect(min.price).toBe('По договорённости');
    expect(min.badges).toEqual([]);
    expect(min.specs).toEqual([{ label: 'Сфера', value: 'Другое' }]);
    expect(buildAdView(get('d-item-full'), now).actionLabel).toBe('Написать');
  });

  it('«в приложении с…» и число объявлений', () => {
    expect(sinceText('2025-09-15T00:00:00.000Z')).toBe('В приложении с сентября 2025');
    expect(sinceText(undefined)).toBeNull();
    expect([adsCountText(1), adsCountText(2), adsCountText(5), adsCountText(11), adsCountText(21)]).toEqual(['1 объявление', '2 объявления', '5 объявлений', '11 объявлений', '21 объявление']);
  });
});
