// Фильтры раздела «Объявления» (окно «Фильтры»): общие для всех и свои у каждой категории.
// Чистая логика без экрана: состояние фильтров, подсчёт активных, проверка объявления. Варианты берём из форм объявлений.
import { typeOfAd, type AdType } from './adDetail';
import { filterByCategory, type Ad, type AdCategory } from './ads';
import type { Amenity, Audience, DistrictChoice, HousingType, RentTermChoice, RoomsCount } from './rent';
import { DISTRICTS } from './rent';
import type { Employment, JobExperience, JobSchedule, WorkFormat } from './job';
import type { ItemCondition } from './sell';
import type { Experience, ServiceAudience, ServiceFormat, TimeSlot } from './service';
import { asksAudience } from './service';

export type FilterCategory = 'items' | 'housing' | 'services' | 'jobs';
export type TimeToUniFilter = 'm15' | 'm30' | 'm60';

export const FILTER_CATEGORIES: readonly { value: FilterCategory; label: string }[] = [
  { value: 'items', label: 'Вещи' },
  { value: 'housing', label: 'Жильё' },
  { value: 'services', label: 'Услуги' },
  { value: 'jobs', label: 'Вакансии' },
];

// Время до университета в фильтре: «до 15 минут» — это варианты формы «до 10»; «до 30» — до 10 и 10–20; «до 60» — ещё и 20–40
export const TIME_TO_UNI_FILTERS: readonly { value: TimeToUniFilter; label: string }[] = [
  { value: 'm15', label: 'До 15 минут' },
  { value: 'm30', label: 'До 30 минут' },
  { value: 'm60', label: 'До 60 минут' },
];
const TIME_ALLOWED: Record<TimeToUniFilter, readonly string[]> = { m15: ['m10'], m30: ['m10', 'm20'], m60: ['m10', 'm20', 'm40'] };

export type AdFilters = {
  category: FilterCategory | null;
  // Общие
  priceFrom: string;
  priceTo: string;
  districts: DistrictChoice[];
  withPhoto: boolean;
  // Вещи: itemKeys — выбранные категории и подкатегории вида «категория|подкатегория» (см. groupKey)
  itemKeys: string[];
  condition: ItemCondition[];
  negotiable: boolean;
  // Жильё
  housingType: HousingType[];
  term: RentTermChoice[];
  rooms: RoomsCount[];
  areaFrom: string;
  areaTo: string;
  audience: Audience[];
  utilitiesIncluded: boolean;
  amenities: Amenity[];
  pets: boolean;
  timeToUni: TimeToUniFilter[];
  // Услуги
  serviceKeys: string[];
  serviceFormats: ServiceFormat[];
  serviceAudience: Exclude<ServiceAudience, 'skip'>[];
  serviceExperience: Exclude<Experience, 'skip'>[];
  serviceTimes: Exclude<TimeSlot, 'skip'>[];
  // Вакансии
  jobKeys: string[];
  employment: Employment[];
  schedule: Exclude<JobSchedule, 'skip'>[];
  workFormat: WorkFormat[];
  jobExperience: JobExperience[];
  studyFriendly: boolean;
  salaryFrom: string;
};

export const emptyFilters = (): AdFilters => ({
  category: null,
  priceFrom: '',
  priceTo: '',
  districts: [],
  withPhoto: false,
  itemKeys: [],
  condition: [],
  negotiable: false,
  housingType: [],
  term: [],
  rooms: [],
  areaFrom: '',
  areaTo: '',
  audience: [],
  utilitiesIncluded: false,
  amenities: [],
  pets: false,
  timeToUni: [],
  serviceKeys: [],
  serviceFormats: [],
  serviceAudience: [],
  serviceExperience: [],
  serviceTimes: [],
  jobKeys: [],
  employment: [],
  schedule: [],
  workFormat: [],
  jobExperience: [],
  studyFriendly: false,
  salaryFrom: '',
});

// Нажали на плитку категории: выбор переключается, а фильтры прошлой категории сбрасываются; общие остаются
export function selectCategory(filters: AdFilters, category: FilterCategory): AdFilters {
  const { priceFrom, priceTo, districts, withPhoto } = filters;
  return { ...emptyFilters(), priceFrom, priceTo, districts, withPhoto, category: filters.category === category ? null : category };
}

// Из категории, пришедшей из каталога или кнопки «Продать», — в категорию фильтра
export const filterCategoryOf = (category: AdCategory | null): FilterCategory | null =>
  category === 'buy' || category === 'sell' ? 'items' : category === 'rent' ? 'housing' : category === 'services' ? 'services' : category === 'jobs' ? 'jobs' : null;

// Какую форму открыть по «+» при выбранной категории (без категории — выбор плиток)
export const newAdCategoryOf = (category: FilterCategory | null): AdCategory | null => (category === 'items' ? 'sell' : category === 'housing' ? 'rent' : category === 'services' ? 'services' : category === 'jobs' ? 'jobs' : null);

const typeToCategory: Record<AdType, FilterCategory> = { item: 'items', rent: 'housing', service: 'services', job: 'jobs' };

// Ключ выбранного пункта списка «категория → подкатегория»: «study|0»; у категории без подкатегорий — «other|»
export const groupKey = (category: string, sub: string | null | undefined): string => `${category}|${sub ?? ''}`;
export const keyCategory = (key: string): string => key.split('|')[0] ?? '';

const num = (text: string): number | null => (text.trim() === '' ? null : Number(text));
const has = (list: readonly unknown[]) => list.length > 0;

// Сколько фильтров включено (для числа на кнопке «Фильтр»): категория — один, цена от–до — один и т. д.
export function countActive(f: AdFilters): number {
  const flags = [
    f.category !== null,
    f.priceFrom !== '' || f.priceTo !== '',
    has(f.districts),
    f.withPhoto,
    has(f.itemKeys),
    has(f.condition),
    f.negotiable,
    has(f.housingType),
    has(f.term),
    has(f.rooms),
    f.areaFrom !== '' || f.areaTo !== '',
    has(f.audience),
    f.utilitiesIncluded,
    has(f.amenities),
    f.pets,
    has(f.timeToUni),
    has(f.serviceKeys),
    has(f.serviceFormats),
    has(f.serviceAudience),
    has(f.serviceExperience),
    has(f.serviceTimes),
    has(f.jobKeys),
    has(f.employment),
    has(f.schedule),
    has(f.workFormat),
    has(f.jobExperience),
    f.studyFriendly,
    f.salaryFrom !== '',
  ];
  return flags.filter(Boolean).length;
}

// Район объявления: из данных формы или, у старых тестовых, по подписи на карточке
function districtOf(ad: Ad): DistrictChoice | null {
  const fromDetails = ad.rentDetails?.district ?? ad.serviceDetails?.district ?? ad.jobDetails?.district ?? null;
  if (fromDetails) return fromDetails;
  return DISTRICTS.find((item) => item.label === ad.district)?.value ?? null;
}

// Цена для фильтра «Цена от/до»: у вакансии — зарплата (верхняя граница, а если нет — нижняя)
const priceOf = (ad: Ad): number | null => (ad.jobDetails ? (ad.jobDetails.salaryTo ?? ad.jobDetails.salaryFrom) : ad.price);

function matchesCommon(ad: Ad, f: AdFilters): boolean {
  const from = num(f.priceFrom);
  const to = num(f.priceTo);
  if (from !== null || to !== null) {
    const price = priceOf(ad);
    if (price === null) return false;
    if (from !== null && price < from) return false;
    if (to !== null && price > to) return false;
  }
  if (has(f.districts)) {
    const own = districtOf(ad);
    if (own === null || !f.districts.includes(own)) return false;
  }
  if (f.withPhoto && ad.photos.length === 0) return false;
  return true;
}

function matchesItems(ad: Ad, f: AdFilters): boolean {
  if (has(f.itemKeys) && (ad.itemCategory == null || !f.itemKeys.includes(groupKey(ad.itemCategory, ad.itemSubcategory)))) return false;
  if (has(f.condition) && (ad.condition == null || !f.condition.includes(ad.condition))) return false;
  if (f.negotiable && ad.price !== null) return false;
  return true;
}

function matchesHousing(ad: Ad, f: AdFilters): boolean {
  const rent = ad.rentDetails ?? null;
  const needsDetails = has(f.housingType) || has(f.rooms) || f.areaFrom !== '' || f.areaTo !== '' || has(f.audience) || f.utilitiesIncluded || has(f.amenities) || f.pets || has(f.timeToUni);
  if (needsDetails && !rent) return false;
  if (has(f.term)) {
    const term = rent?.term ?? (ad.rentTerm === 'daily' ? 'daily' : 'long');
    if (!f.term.includes(term)) return false;
  }
  if (!rent) return true;
  if (has(f.housingType) && !f.housingType.includes(rent.housingType)) return false;
  if (has(f.rooms) && (rent.rooms === null || !f.rooms.includes(rent.rooms))) return false;
  const areaFrom = num(f.areaFrom);
  const areaTo = num(f.areaTo);
  if (areaFrom !== null || areaTo !== null) {
    if (rent.area === null) return false;
    if (areaFrom !== null && rent.area < areaFrom) return false;
    if (areaTo !== null && rent.area > areaTo) return false;
  }
  if (has(f.audience) && (rent.audience === null || !f.audience.includes(rent.audience))) return false;
  if (f.utilitiesIncluded && rent.utilities !== 'included') return false;
  if (!f.amenities.every((item) => rent.amenities.includes(item))) return false;
  if (f.pets && rent.pets !== 'yes') return false;
  if (has(f.timeToUni)) {
    // Несколько вариантов «до 15 / 30 / 60 минут» — подходит всё, что входит хотя бы в один
    const allowed = f.timeToUni.flatMap((item) => TIME_ALLOWED[item]);
    if (rent.timeToUni === null || !allowed.includes(rent.timeToUni)) return false;
  }
  return true;
}

// Спрашивать «Для кого» имеет смысл, если среди выбранных категорий услуг есть учёба или красота
export const asksAudienceIn = (keys: readonly string[]): boolean => keys.some((key) => asksAudience(keyCategory(key)));

function matchesServices(ad: Ad, f: AdFilters): boolean {
  const service = ad.serviceDetails ?? null;
  const needsDetails = has(f.serviceKeys) || has(f.serviceFormats) || has(f.serviceAudience) || has(f.serviceExperience) || has(f.serviceTimes);
  if (needsDetails && !service) return false;
  if (!service) return true;
  if (has(f.serviceKeys) && !f.serviceKeys.includes(groupKey(service.category, service.subcategory))) return false;
  if (has(f.serviceFormats) && !f.serviceFormats.some((item) => service.formats.includes(item))) return false;
  // «Для кого» учитываем только когда выбраны учёба или красота; объявления «для всех» подходят любому выбору
  if (has(f.serviceAudience) && asksAudienceIn(f.serviceKeys) && (service.audience === null || (!f.serviceAudience.includes(service.audience) && service.audience !== 'all'))) return false;
  if (has(f.serviceExperience) && (service.experience === null || !f.serviceExperience.includes(service.experience))) return false;
  if (has(f.serviceTimes) && !f.serviceTimes.some((item) => service.times.includes(item))) return false;
  return true;
}

function matchesJobs(ad: Ad, f: AdFilters): boolean {
  const job = ad.jobDetails ?? null;
  const needsDetails = has(f.jobKeys) || has(f.employment) || has(f.schedule) || has(f.workFormat) || has(f.jobExperience) || f.studyFriendly || f.salaryFrom !== '';
  if (needsDetails && !job) return false;
  if (!job) return true;
  if (has(f.jobKeys) && !f.jobKeys.includes(groupKey(job.field, job.subfield))) return false;
  if (has(f.employment) && !f.employment.some((item) => job.employment.includes(item))) return false;
  if (has(f.schedule) && !f.schedule.some((item) => job.schedule.includes(item))) return false;
  if (has(f.workFormat) && (job.format === null || !f.workFormat.includes(job.format))) return false;
  if (has(f.jobExperience) && (job.experience === null || !f.jobExperience.includes(job.experience))) return false;
  if (f.studyFriendly && !job.studyFriendly) return false;
  const salaryFrom = num(f.salaryFrom);
  if (salaryFrom !== null) {
    const top = job.salaryTo ?? job.salaryFrom;
    if (top === null || top < salaryFrom) return false;
  }
  return true;
}

export function matchesFilters(ad: Ad, f: AdFilters): boolean {
  const own = typeToCategory[typeOfAd(ad)];
  if (f.category !== null && own !== f.category) return false;
  if (!matchesCommon(ad, f)) return false;
  if (own === 'items') return matchesItems(ad, f);
  if (own === 'housing') return matchesHousing(ad, f);
  if (own === 'services') return matchesServices(ad, f);
  return matchesJobs(ad, f);
}

// Список раздела: поиск по словам и все фильтры; книги в «Объявления» не попадают
export function applyFilters(ads: readonly Ad[], filters: AdFilters, query: string): Ad[] {
  return filterByCategory(ads, null, query).filter((ad) => matchesFilters(ad, filters));
}

// «Показать 5 объявлений», «Показать 1 объявление»
export function showCountText(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  const word = lastTwo >= 11 && lastTwo <= 14 ? 'объявлений' : last === 1 ? 'объявление' : last >= 2 && last <= 4 ? 'объявления' : 'объявлений';
  return `Показать ${count} ${word}`;
}

// Что написать на закрытой строке фильтра: «Учёба, Красота» или «Выбрано: 5», если вариантов много
export function multiSummary(labels: readonly string[], count: number = labels.length): string | null {
  if (labels.length === 0) return null;
  return labels.length <= 2 ? labels.join(', ') : `Выбрано: ${count}`;
}

export type FilterGroup = { value: string; label: string; subs: readonly { value: string; label: string }[] };

// Листья группы: у раздела с пунктами это его пункты, у раздела без пунктов («Другое») — он сам
export const groupLeaves = (group: FilterGroup): string[] => (group.subs.length > 0 ? group.subs.map((sub) => groupKey(group.value, sub.value)) : [groupKey(group.value, '')]);

export type GroupState = 'on' | 'off' | 'partial';
export function groupState(group: FilterGroup, keys: readonly string[]): GroupState {
  const leaves = groupLeaves(group);
  const picked = leaves.filter((leaf) => keys.includes(leaf)).length;
  return picked === 0 ? 'off' : picked === leaves.length ? 'on' : 'partial';
}

// Нажали на квадратик раздела: выбраны все пункты — снимаем их, иначе выбираем все
export function toggleGroup(group: FilterGroup, keys: readonly string[]): string[] {
  const leaves = groupLeaves(group);
  return groupState(group, keys) === 'on' ? keys.filter((key) => !leaves.includes(key)) : [...keys.filter((key) => !leaves.includes(key)), ...leaves];
}

export function toggleLeaf(key: string, keys: readonly string[]): string[] {
  return keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key];
}

// Подпись выбранного для закрытой строки: раздел целиком — его название, часть раздела — названия пунктов
export function groupSummary(groups: readonly FilterGroup[], keys: readonly string[]): string | null {
  const names: string[] = [];
  let count = 0;
  for (const group of groups) {
    const state = groupState(group, keys);
    if (state === 'off') continue;
    const leaves = groupLeaves(group).filter((leaf) => keys.includes(leaf));
    count += leaves.length;
    if (state === 'on') names.push(group.label);
    else for (const leaf of leaves) names.push(group.subs.find((sub) => groupKey(group.value, sub.value) === leaf)?.label ?? group.label);
  }
  return multiSummary(names, count);
}
