import { describe, expect, it } from 'vitest';
import { cardPrice } from './ads';
import { toggleChoice } from './choices';
import { JOB_FIELDS, SCHEDULES, emptyJobDraft, formatSalary, hasSalary, isJobReady, isJobTouched, showsPlace, toJobDetails, type JobDraft } from './job';

const ready = (): JobDraft => ({ ...emptyJobDraft(), position: 'Бариста', company: 'Кофейня «Перемена»', field: 'food', subfield: '0', salaryFrom: '30000' });

describe('форма «Разместить вакансию»', () => {
  it('«Опубликовать» ждёт должность, компанию, сферу и зарплату; фото не нужно', () => {
    expect(isJobReady(emptyJobDraft())).toBe(false);
    expect(isJobReady(ready())).toBe(true);
    expect(isJobReady({ ...ready(), position: ' ' })).toBe(false);
    expect(isJobReady({ ...ready(), company: '' })).toBe(false);
    expect(isJobReady({ ...ready(), field: null })).toBe(false);
    expect(isJobReady({ ...ready(), salaryFrom: '' })).toBe(false);
    expect(isJobReady({ ...ready(), salaryFrom: '', salaryNegotiable: true })).toBe(true);
  });

  it('зарплата: достаточно «от» или «до»; «от» не больше «до»', () => {
    expect(hasSalary({ salaryFrom: '', salaryTo: '50000', salaryNegotiable: false })).toBe(true);
    expect(hasSalary({ salaryFrom: '30000', salaryTo: '50000', salaryNegotiable: false })).toBe(true);
    expect(hasSalary({ salaryFrom: '60000', salaryTo: '50000', salaryNegotiable: false })).toBe(false);
    expect(hasSalary({ salaryFrom: '0', salaryTo: '', salaryNegotiable: false })).toBe(false);
  });

  it('понимает, что форма начата (единица зарплаты по умолчанию не считается)', () => {
    expect(isJobTouched(emptyJobDraft())).toBe(false);
    expect(isJobTouched({ ...emptyJobDraft(), studyFriendly: true })).toBe(true);
    expect(isJobTouched({ ...emptyJobDraft(), salaryUnit: 'hour' })).toBe(true);
  });

  it('сферы: 9 штук, у «Другого» подсфер нет', () => {
    expect(JOB_FIELDS.map((item) => item.label)).toEqual(['Общепит', 'Торговля', 'Офис и администрирование', 'IT', 'Образование', 'Курьеры и доставка', 'Промо и мероприятия', 'Красота', 'Другое']);
    expect(JOB_FIELDS[0]?.subs.map((item) => item.label)).toEqual(['Бариста', 'Официант', 'Повар', 'Кассир']);
    expect(JOB_FIELDS[8]?.subs).toEqual([]);
  });

  it('«Удалённо» скрывает адрес и район; скрытое не попадает в объявление, но не пропадает', () => {
    expect([showsPlace(null), showsPlace('office'), showsPlace('hybrid'), showsPlace('remote')]).toEqual([true, true, true, false]);
    const withPlace = { ...ready(), address: 'ул. Красная, 5', district: 'west' as const };
    const office = toJobDetails({ ...withPlace, format: 'office' });
    expect([office.address, office.district]).toEqual(['ул. Красная, 5', 'west']);
    const remote = toJobDetails({ ...withPlace, format: 'remote' });
    expect([remote.address, remote.district]).toEqual([null, null]);
    expect(toJobDetails({ ...withPlace, format: 'hybrid' }).address).toBe('ул. Красная, 5');
  });

  it('график: группы, «Не указать» снимает остальные и наоборот', () => {
    expect(SCHEDULES.map((item) => [item.label, item.group])).toEqual([['Будни', 0], ['Выходные', 0], ['День', 1], ['Вечер', 1], ['Ночь', 1], ['Гибкий', 2], ['Не указать', 2]]);
    const pick = (values: JobDraft['schedule'], value: JobDraft['schedule'][number]) => toggleChoice(values, value, SCHEDULES, 'skip');
    expect(pick(['weekdays', 'night'], 'skip')).toEqual(['skip']);
    expect(pick(['skip'], 'flexible')).toEqual(['flexible']);
    expect(pick(['day'], 'evening')).toEqual(['day', 'evening']);
    expect(toJobDetails({ ...ready(), schedule: ['skip'] }).schedule).toEqual([]);
  });

  it('«По договорённости» убирает зарплату и единицу; «Не указать» убирает оформление', () => {
    const negotiable = toJobDetails({ ...ready(), salaryTo: '50000', salaryNegotiable: true });
    expect([negotiable.salaryFrom, negotiable.salaryTo, negotiable.salaryUnit]).toEqual([null, null, null]);
    expect(toJobDetails({ ...ready(), registration: 'skip' }).registration).toBeNull();
    expect(toJobDetails({ ...ready(), registration: 'official' }).registration).toBe('official');
  });

  it('зарплата на карточке', () => {
    expect(formatSalary(30000, null, 'month')).toBe('от 30 000 ₽ / мес.');
    expect(formatSalary(null, 50000, 'shift')).toBe('до 50 000 ₽ / смена');
    expect(formatSalary(30000, 50000, 'hour')).toBe('30 000–50 000 ₽ / час');
    expect(formatSalary(30000, 30000, 'month')).toBe('30 000 ₽ / мес.');
    expect(formatSalary(null, null, 'month')).toBeNull();
    const base = { section: 'jobs' as const, kind: null, rentTerm: null, price: null };
    expect(cardPrice({ ...base, jobDetails: toJobDetails(ready()) })).toBe('от 30 000 ₽ / мес.');
    expect(cardPrice({ ...base, jobDetails: toJobDetails({ ...ready(), salaryNegotiable: true }) })).toBe('По договорённости');
    expect(cardPrice({ ...base, jobDetails: null })).toBe('Вакансия');
  });
});
