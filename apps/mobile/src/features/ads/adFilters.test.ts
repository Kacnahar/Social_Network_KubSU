import { describe, expect, it } from 'vitest';
import { applyFilters, asksAudienceIn, countActive, groupLeaves, groupState, groupSummary, multiSummary, toggleGroup, toggleLeaf, type FilterGroup, emptyFilters, filterCategoryOf, newAdCategoryOf, selectCategory, showCountText, type AdFilters } from './adFilters';
import { testAdsForFilters, testAdsForPage } from './testAds';

const all = [...testAdsForPage(), ...testAdsForFilters()];
const ids = (filters: Partial<AdFilters>, query = '') => applyFilters(all, { ...emptyFilters(), ...filters }, query).map((ad) => ad.adId).sort();

describe('фильтры «Объявлений»', () => {
  it('без фильтров — все объявления', () => {
    expect(ids({})).toHaveLength(all.length);
    expect(countActive(emptyFilters())).toBe(0);
  });

  it('категории', () => {
    expect(ids({ category: 'items' })).toEqual(['d-item-full', 'd-item-min', 'f-item-headphones', 'f-item-laptop']);
    expect(ids({ category: 'housing' })).toEqual(['d-rent-full', 'd-rent-min', 'f-rent-bed', 'f-rent-studio']);
    expect(ids({ category: 'jobs' })).toEqual(['d-job-full', 'd-job-min', 'f-job-courier']);
  });

  it('повторное нажатие на выбранную категорию снимает выбор; фильтры прошлой категории сбрасываются, общие остаются', () => {
    const base = { ...emptyFilters(), category: 'items' as const, condition: ['new' as const], priceTo: '5000', withPhoto: true };
    expect(selectCategory(base, 'items').category).toBeNull();
    const next = selectCategory(base, 'housing');
    expect(next.category).toBe('housing');
    expect(next.condition).toEqual([]);
    expect([next.priceTo, next.withPhoto]).toEqual(['5000', true]);
  });

  it('общие: цена от/до, район, только с фото', () => {
    expect(ids({ category: 'items', priceFrom: '1000', priceTo: '5000' })).toEqual(['f-item-headphones']);
    expect(ids({ districts: ['west'] })).toEqual(['d-rent-full', 'f-service-manicure'].sort());
    expect(ids({ category: 'items', withPhoto: true })).toEqual(['d-item-full', 'f-item-laptop']);
    // без цены под фильтр по цене не попадают
    expect(ids({ category: 'items', priceFrom: '1' })).not.toContain('d-item-min');
  });

  it('вещи: состояние, подкатегория, «Договорная»', () => {
    expect(ids({ category: 'items', condition: ['new'] })).toEqual(['f-item-headphones']);
    expect(ids({ category: 'items', itemKeys: ['books|1'] })).toEqual(['d-item-full']);
    expect(ids({ category: 'items', itemKeys: ['books|0'] })).toEqual([]);
    expect(ids({ category: 'items', negotiable: true })).toEqual(['d-item-min']);
  });

  it('жильё: тип, срок, комнат, площадь, с кем, коммуналка, удобства, животные, время до университета', () => {
    expect(ids({ category: 'housing', housingType: ['bed'] })).toEqual(['f-rent-bed']);
    expect(ids({ category: 'housing', term: ['semester'] })).toEqual(['d-rent-min', 'f-rent-bed']);
    expect(ids({ category: 'housing', rooms: ['studio'] })).toEqual(['f-rent-studio']);
    expect(ids({ category: 'housing', areaFrom: '30' })).toEqual(['d-rent-full']);
    expect(ids({ category: 'housing', areaTo: '30' })).toEqual(['f-rent-studio']);
    expect(ids({ category: 'housing', audience: ['girls'] })).toEqual(['f-rent-bed']);
    expect(ids({ category: 'housing', utilitiesIncluded: true })).toEqual(['f-rent-studio']);
    expect(ids({ category: 'housing', amenities: ['wifi', 'fridge'] })).toEqual(['d-rent-full', 'f-rent-studio']);
    expect(ids({ category: 'housing', pets: true })).toEqual(['f-rent-studio']);
    expect(ids({ category: 'housing', timeToUni: ['m15'] })).toEqual(['f-rent-bed'].concat(['d-rent-full']).sort());
    expect(ids({ category: 'housing', timeToUni: ['m30'] })).toEqual(['d-rent-full', 'f-rent-bed', 'f-rent-studio']);
  });

  it('услуги: категория, формат, для кого, опыт, когда удобно', () => {
    expect(ids({ category: 'services', serviceKeys: ['beauty|0'] })).toEqual(['f-service-manicure']);
    expect(ids({ category: 'services', serviceFormats: ['online'] })).toEqual(['d-service-full', 'd-service-min']);
    // «Для всех» подходит любому выбору
    expect(ids({ category: 'services', serviceKeys: ['study|0'], serviceAudience: ['boys'] })).toEqual(['d-service-full']);
    expect(ids({ category: 'services', serviceExperience: ['over3'] })).toEqual(['f-service-manicure']);
    expect(ids({ category: 'services', serviceTimes: ['evening'] })).toEqual(['d-service-full', 'f-service-manicure']);
  });

  it('вакансии: сфера, занятость, график, формат, опыт, учёба, зарплата от', () => {
    expect(ids({ category: 'jobs', jobKeys: ['delivery|2'] })).toEqual(['f-job-courier']);
    expect(ids({ category: 'jobs', employment: ['part'] })).toEqual(['d-job-full']);
    expect(ids({ category: 'jobs', schedule: ['flexible'] })).toEqual(['f-job-courier']);
    expect(ids({ category: 'jobs', workFormat: ['office'] })).toEqual(['d-job-full', 'f-job-courier']);
    expect(ids({ category: 'jobs', jobExperience: ['none'] })).toEqual(['d-job-full', 'f-job-courier']);
    expect(ids({ category: 'jobs', studyFriendly: true })).toEqual(['d-job-full', 'f-job-courier']);
    expect(ids({ category: 'jobs', salaryFrom: '40000' })).toEqual(['d-job-full']);
  });

  it('поиск работает вместе с фильтрами', () => {
    expect(ids({ category: 'items' }, 'наушники')).toEqual(['f-item-headphones']);
    expect(ids({ category: 'housing' }, 'наушники')).toEqual([]);
  });

  it('число активных фильтров', () => {
    expect(countActive({ ...emptyFilters(), category: 'items', priceFrom: '1', priceTo: '9', condition: ['new'], withPhoto: true })).toBe(4);
    expect(countActive({ ...emptyFilters(), category: 'housing', amenities: ['wifi', 'ac'], areaFrom: '10' })).toBe(3);
  });

  it('связь с «+» и каталогом; подпись кнопки', () => {
    expect([filterCategoryOf('buy'), filterCategoryOf('sell'), filterCategoryOf('rent'), filterCategoryOf('services'), filterCategoryOf(null)]).toEqual(['items', 'items', 'housing', 'services', null]);
    expect([newAdCategoryOf('items'), newAdCategoryOf('housing'), newAdCategoryOf(null)]).toEqual(['sell', 'rent', null]);
    expect([showCountText(1), showCountText(3), showCountText(5), showCountText(11), showCountText(0)]).toEqual(['Показать 1 объявление', 'Показать 3 объявления', 'Показать 5 объявлений', 'Показать 11 объявлений', 'Показать 0 объявлений']);
  });

  it('несколько вариантов сразу: подходит любой из выбранных', () => {
    expect(ids({ category: 'housing', housingType: ['bed', 'flat'] })).toEqual(['d-rent-full', 'f-rent-bed', 'f-rent-studio']);
    expect(ids({ category: 'items', condition: ['new', 'used'] })).toEqual(['d-item-full', 'f-item-headphones', 'f-item-laptop']);
    expect(ids({ category: 'services', serviceKeys: ['beauty|0', 'it|2'] })).toEqual(['d-service-min', 'f-service-manicure']);
    expect(ids({ districts: ['west', 'center'] })).toEqual(['d-rent-full', 'd-rent-min', 'd-job-full', 'f-job-courier', 'f-rent-bed', 'f-service-manicure', 'd-service-full'].sort());
    // «до 15» и «до 60» вместе — это «до 60»
    expect(ids({ category: 'housing', timeToUni: ['m15', 'm60'] })).toEqual(['d-rent-full', 'f-rent-bed', 'f-rent-studio']);
  });

  it('«Для кого» учитывается, только если выбрана учёба или красота', () => {
    expect(ids({ category: 'services', serviceKeys: ['it|2'], serviceAudience: ['boys'] })).toEqual(['d-service-min']);
    expect(asksAudienceIn(['it|2'])).toBe(false);
    expect(asksAudienceIn(['it|2', 'beauty|0'])).toBe(true);
  });

  it('разделы: квадратик раздела выбирает и снимает все пункты, при части — «—»', () => {
    const study: FilterGroup = { value: 'study', label: 'Учёба', subs: [{ value: '0', label: 'Репетиторство' }, { value: '1', label: 'Переводы' }] };
    const other: FilterGroup = { value: 'other', label: 'Другое', subs: [] };
    expect(groupLeaves(study)).toEqual(['study|0', 'study|1']);
    expect(groupLeaves(other)).toEqual(['other|']);
    expect(groupState(study, [])).toBe('off');
    expect(groupState(study, ['study|0'])).toBe('partial');
    expect(groupState(study, ['study|0', 'study|1'])).toBe('on');
    expect(toggleGroup(study, [])).toEqual(['study|0', 'study|1']);
    expect(toggleGroup(study, ['study|0'])).toEqual(['study|0', 'study|1']);
    expect(toggleGroup(study, ['study|0', 'study|1', 'beauty|0'])).toEqual(['beauty|0']);
    expect(toggleLeaf('study|0', ['study|0'])).toEqual([]);
    expect(toggleLeaf('study|1', ['study|0'])).toEqual(['study|0', 'study|1']);
    expect(groupState(other, ['other|'])).toBe('on');
  });

  it('подпись закрытой строки: «Учёба, Красота» или «Выбрано: N»', () => {
    const groups: FilterGroup[] = [
      { value: 'study', label: 'Учёба', subs: [{ value: '0', label: 'Репетиторство' }, { value: '1', label: 'Переводы' }] },
      { value: 'beauty', label: 'Красота', subs: [{ value: '0', label: 'Маникюр' }, { value: '1', label: 'Стрижки' }] },
      { value: 'other', label: 'Другое', subs: [] },
    ];
    expect(groupSummary(groups, [])).toBeNull();
    expect(groupSummary(groups, ['study|0', 'study|1', 'beauty|0', 'beauty|1'])).toBe('Учёба, Красота');
    expect(groupSummary(groups, ['study|0'])).toBe('Репетиторство');
    expect(groupSummary(groups, ['study|0', 'beauty|1'])).toBe('Репетиторство, Стрижки');
    expect(groupSummary(groups, ['study|0', 'study|1', 'beauty|0', 'other|'])).toBe('Выбрано: 4');
    expect(multiSummary(['Квартира', 'Комната'])).toBe('Квартира, Комната');
    expect(multiSummary(['А', 'Б', 'В'])).toBe('Выбрано: 3');
    expect(multiSummary([])).toBeNull();
  });
});
