import { describe, expect, it } from 'vitest';
import { DISTRICTS, districtLabel, emptyRentDraft, hidesFloors, hidesRooms, isRentReady, isRentTouched, rentPriceLabel, rentTermOf, rentTitle, summarize, toRentDetails, type RentDraft } from './rent';

const ready = (): RentDraft => ({ ...emptyRentDraft(), photos: ['a'], housingType: 'room', price: '14000', address: 'Центральный', timeToUni: 'm10', term: 'long' });

describe('форма «Сдать жильё»', () => {
  it('«Опубликовать» ждёт фото, тип, цену или «Договорная», адрес, время до университета и срок', () => {
    expect(isRentReady(emptyRentDraft())).toBe(false);
    expect(isRentReady(ready())).toBe(true);
    expect(isRentReady({ ...ready(), photos: [] })).toBe(false);
    expect(isRentReady({ ...ready(), housingType: null })).toBe(false);
    expect(isRentReady({ ...ready(), price: '' })).toBe(false);
    expect(isRentReady({ ...ready(), price: '', negotiable: true })).toBe(true);
    expect(isRentReady({ ...ready(), address: '  ' })).toBe(false);
    expect(isRentReady({ ...ready(), timeToUni: null })).toBe(false);
    expect(isRentReady({ ...ready(), term: null })).toBe(false);
  });

  it('понимает, что форма начата', () => {
    expect(isRentTouched(emptyRentDraft())).toBe(false);
    expect(isRentTouched({ ...emptyRentDraft(), amenities: ['wifi'] })).toBe(true);
    expect(isRentTouched({ ...emptyRentDraft(), noDeposit: true })).toBe(true);
    expect(isRentTouched({ ...emptyRentDraft(), description: ' ' })).toBe(false);
  });

  it('залог: «Без залога» убирает сумму', () => {
    expect(toRentDetails({ ...ready(), deposit: '5000' }).deposit).toBe(5000);
    expect(toRentDetails({ ...ready(), deposit: '5000', noDeposit: true }).deposit).toBeNull();
    expect(toRentDetails(ready()).deposit).toBeNull();
  });

  it('числа и срок', () => {
    const details = toRentDetails({ ...ready(), area: '45', floor: '3', floors: '9' });
    expect([details.area, details.floor, details.floors]).toEqual([45, 3, 9]);
    expect(rentTermOf('daily')).toBe('daily');
    expect(rentTermOf('semester')).toBe('monthly');
    expect(rentPriceLabel('daily')).toBe('Цена за сутки');
    expect(rentPriceLabel(null)).toBe('Цена в месяц');
  });

  it('заголовок объявления собирается из полей', () => {
    expect(rentTitle({ housingType: 'flat', rooms: 'r2', area: '45' })).toBe('Квартира, 2-комн., 45 м²');
    expect(rentTitle({ housingType: 'room', rooms: null, area: '' })).toBe('Комната');
    expect(rentTitle({ housingType: 'bed', rooms: 'r1', area: '' })).toBe('Койко-место');
  });

  it('удобства в строке: «Мебель, Wi-Fi +2»', () => {
    expect(summarize(['Мебель'])).toBe('Мебель');
    expect(summarize(['Мебель', 'Wi-Fi'])).toBe('Мебель, Wi-Fi');
    expect(summarize(['Мебель', 'Wi-Fi', 'Холодильник', 'Кондиционер'])).toBe('Мебель, Wi-Fi +2');
  });

  it('«Не указать» в времени до университета: строка в объявлении не показывается, публиковать можно', () => {
    expect(isRentReady({ ...ready(), timeToUni: 'skip' })).toBe(true);
    expect(toRentDetails({ ...ready(), timeToUni: 'skip' }).timeToUni).toBeNull();
    expect(toRentDetails(ready()).timeToUni).toBe('m10');
  });

  it('койко-место прячет комнаты и площадь, дом — этаж и этажей; скрытое не попадает в объявление', () => {
    expect([hidesRooms('bed'), hidesRooms('flat'), hidesFloors('house'), hidesFloors('flat')]).toEqual([true, false, true, false]);
    const filled = { ...ready(), rooms: 'r2' as const, area: '40', floor: '2', floors: '5' };
    const bed = toRentDetails({ ...filled, housingType: 'bed' });
    expect([bed.rooms, bed.area, bed.floor, bed.floors]).toEqual([null, null, 2, 5]);
    const house = toRentDetails({ ...filled, housingType: 'house' });
    expect([house.rooms, house.area, house.floor, house.floors]).toEqual(['r2', 40, null, null]);
    expect(rentTitle({ housingType: 'bed', rooms: 'r2', area: '40' })).toBe('Койко-место');
    // значения не пропали: если вернуть тип, строки снова с данными
    expect(toRentDetails({ ...filled, housingType: 'flat' }).area).toBe(40);
  });

  it('район: «Не указать» и невыбранный не попадают в объявление; адрес сохраняется', () => {
    expect(toRentDetails({ ...ready(), district: 'west', address: ' ул. Ставропольская, 149 ' }).district).toBe('west');
    expect(toRentDetails({ ...ready(), district: 'west', address: ' ул. Ставропольская, 149 ' }).address).toBe('ул. Ставропольская, 149');
    expect(toRentDetails({ ...ready(), district: 'skip' }).district).toBeNull();
    expect(toRentDetails(ready()).district).toBeNull();
    expect(isRentReady({ ...ready(), district: null })).toBe(true);
    expect(districtLabel('adygea')).toBe('Новая Адыгея');
    expect(districtLabel('skip')).toBeNull();
    expect(districtLabel(null)).toBeNull();
  });

  it('список районов: без «Хуторов Краснодара», «Не указать» последним', () => {
    expect(DISTRICTS.map((item) => item.label)).toEqual([
      'Западный', 'Центральный', 'Прикубанский', 'Карасунский', 'Новая Адыгея',
      'Берёзовский сельский округ', 'Елизаветинский сельский округ', 'Калининский сельский округ', 'Пашковский сельский округ', 'Старокорсунский сельский округ', 'Динской район', 'Не указать',
    ]);
  });
});
