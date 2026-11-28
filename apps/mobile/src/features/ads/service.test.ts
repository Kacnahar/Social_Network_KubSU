import { describe, expect, it } from 'vitest';
import { cardPrice, formatAdPrice } from './ads';
import { toggleChoice } from './choices';
import { TIME_SLOTS, asksAudience, EXPERIENCES, SERVICE_CATEGORIES, emptyServiceDraft, formatServicePrice, isServiceReady, isServiceTouched, serviceWhere, showsDistrict, toServiceDetails, type ServiceDraft } from './service';

const ready = (): ServiceDraft => ({ ...emptyServiceDraft(), title: 'Репетитор по матанализу', category: 'study', subcategory: '0', price: '600' });

describe('форма «Предложить услугу»', () => {
  it('«Опубликовать» ждёт название, категорию и цену или «Договорная»; фото не нужно', () => {
    expect(isServiceReady(emptyServiceDraft())).toBe(false);
    expect(isServiceReady(ready())).toBe(true);
    expect(isServiceReady({ ...ready(), title: ' ' })).toBe(false);
    expect(isServiceReady({ ...ready(), category: null })).toBe(false);
    expect(isServiceReady({ ...ready(), price: '' })).toBe(false);
    expect(isServiceReady({ ...ready(), price: '', negotiable: true })).toBe(true);
  });

  it('понимает, что форма начата (единица цены по умолчанию не считается)', () => {
    expect(isServiceTouched(emptyServiceDraft())).toBe(false);
    expect(isServiceTouched({ ...emptyServiceDraft(), times: ['evening'] })).toBe(true);
    expect(isServiceTouched({ ...emptyServiceDraft(), unit: 'job' })).toBe(true);
  });

  it('категории: 8 штук, у каждой нужные подкатегории, у «Другого» их нет', () => {
    expect(SERVICE_CATEGORIES.map((item) => item.label)).toEqual(['Учёба', 'Красота', 'IT и дизайн', 'Фото и видео', 'Ремонт техники', 'Уборка и переезд', 'Спорт', 'Другое']);
    expect(SERVICE_CATEGORIES[0]?.subs.map((item) => item.label)).toEqual(['Репетиторство', 'Помощь с курсовыми', 'Переводы', 'Подготовка к экзаменам']);
    expect(SERVICE_CATEGORIES[7]?.subs).toEqual([]);
  });

  it('район спрашиваем только при «У меня»; скрытое значение не попадает в объявление', () => {
    expect([showsDistrict([]), showsDistrict(['online']), showsDistrict(['online', 'home']), showsDistrict(['home']), showsDistrict(['visit', 'campus'])]).toEqual([false, false, true, true, false]);
    const withDistrict = { ...ready(), district: 'west' as const };
    expect(toServiceDetails({ ...withDistrict, formats: ['online'] }).district).toBeNull();
    expect(toServiceDetails({ ...withDistrict, formats: ['visit'] }).district).toBeNull();
    expect(toServiceDetails({ ...withDistrict, formats: ['online', 'home'] }).district).toBe('west');
    // значение не пропало: если снова выбрать «У меня», оно на месте
    expect(toServiceDetails({ ...withDistrict, formats: ['home'] }).district).toBe('west');
    expect(serviceWhere(['online'], null)).toBe('Онлайн');
    expect(serviceWhere(['home'], null)).toBeNull();
    expect(serviceWhere(['home'], 'Западный')).toBe('Западный');
  });

  it('«Для кого» только у учёбы и красоты; при смене категории значение не учитывается', () => {
    expect([asksAudience('study'), asksAudience('beauty'), asksAudience('it'), asksAudience(null)]).toEqual([true, true, false, false]);
    const girls = { ...ready(), audience: 'girls' as const };
    expect(toServiceDetails({ ...girls, category: 'study' }).audience).toBe('girls');
    expect(toServiceDetails({ ...girls, category: 'beauty' }).audience).toBe('girls');
    expect(toServiceDetails({ ...girls, category: 'it' }).audience).toBeNull();
    expect(toServiceDetails({ ...girls, audience: 'skip' }).audience).toBeNull();
  });

  it('«Когда удобно»: три группы, «Не указать» снимает остальные, другие снимают «Не указать»', () => {
    expect(TIME_SLOTS.map((item) => [item.label, item.group])).toEqual([['Будни', 0], ['Выходные', 0], ['Днём', 1], ['Вечером', 1], ['По договорённости', 2], ['Не указать', 2]]);
    const pick = (values: Parameters<typeof toggleChoice<(typeof TIME_SLOTS)[number]['value']>>[0], value: (typeof TIME_SLOTS)[number]['value']) => toggleChoice(values, value, TIME_SLOTS, 'skip');
    expect(pick(['weekdays', 'evening'], 'skip')).toEqual(['skip']);
    expect(pick(['skip'], 'weekend')).toEqual(['weekend']);
    expect(pick(['evening'], 'weekdays')).toEqual(['weekdays', 'evening']);
    expect(pick(['weekdays'], 'weekdays')).toEqual([]);
    expect(pick(['skip'], 'skip')).toEqual([]);
    expect(toServiceDetails({ ...ready(), times: ['skip'] }).times).toEqual([]);
    expect(toServiceDetails({ ...ready(), times: ['day', 'evening'] }).times).toEqual(['day', 'evening']);
  });

  it('«Договорная» убирает единицу цены; «Не указать» убирает опыт', () => {
    expect(toServiceDetails(ready()).priceUnit).toBe('hour');
    expect(toServiceDetails({ ...ready(), negotiable: true }).priceUnit).toBeNull();
    expect(toServiceDetails({ ...ready(), experience: 'skip' }).experience).toBeNull();
    expect(toServiceDetails({ ...ready(), experience: 'over3' }).experience).toBe('over3');
    expect(EXPERIENCES.map((item) => item.label)).toEqual(['До 1 года', '1–3 года', 'Больше 3 лет', 'Не указать']);
  });

  it('цена с единицей на карточке', () => {
    expect(formatServicePrice(600, 'hour')).toBe('600 ₽ / час');
    expect(formatServicePrice(500, 'from')).toBe('от 500 ₽');
    expect(formatServicePrice(1200, 'lesson')).toBe('1 200 ₽ / занятие');
    expect(formatServicePrice(1500, 'job')).toBe('1 500 ₽ / работа');
    expect(formatServicePrice(null, 'hour')).toBeNull();
    const base = { section: 'services' as const, kind: null, rentTerm: null };
    expect(cardPrice({ ...base, price: 600, serviceDetails: { ...toServiceDetails(ready()), priceUnit: 'hour' } })).toBe('600 ₽ / час');
    expect(cardPrice({ ...base, price: null, serviceDetails: null })).toBe('Услуга');
    expect(cardPrice({ ...base, price: null, serviceDetails: toServiceDetails({ ...ready(), negotiable: true }) })).toBe('Договорная');
    expect(formatAdPrice({ price: 700, kind: 'sell', rentTerm: null })).toBe(formatAdPrice({ price: 700, kind: 'sell', rentTerm: null, serviceDetails: null }));
  });
});
