// Страница объявления: что показать для каждого из четырёх типов — Вещь, Жильё, Услуга, Вакансия.
// Чистая логика без экрана: из объявления получаем цену, метки, список характеристик и т. д. Показываем только заполненное
// и не «Не указать».
import { formatPostTime } from '../../lib/relativeTime';
import { cardPrice, type Ad } from './ads';
import { EXPERIENCES, SERVICE_AUDIENCES, SERVICE_CATEGORIES, SERVICE_FORMATS, TIME_SLOTS } from './service';
import { AUDIENCES, AMENITIES, DISTRICTS, HOUSING_TYPES, RENT_TERM_CHOICES, ROOMS_COUNTS, TIMES_TO_UNI, UTILITIES, type Amenity } from './rent';
import { EMPLOYMENTS, JOB_EXPERIENCES, JOB_FIELDS, REGISTRATIONS, SCHEDULES, WORK_FORMATS } from './job';
import { categoryLabel, conditionLabel, placeLabel } from './sell';

export type AdType = 'item' | 'rent' | 'service' | 'job';
export type Spec = { label: string; value: string };

export type AdView = {
  type: AdType;
  price: string;
  // Маленькая метка под ценой: «Торг» / «Обмен»
  tag: string | null;
  title: string;
  // Серым под названием: район · время публикации
  meta: string;
  // Вакансия: метки занятости, формата и «Можно совмещать с учёбой»
  badges: string[];
  // Жильё: «2 комн. · 45 м² · 3/9 этаж»
  homeStats: string[];
  specs: Spec[];
  amenities: { value: Amenity; label: string }[];
  address: string | null;
  // Вакансия: работодатель
  company: string | null;
  // «Написать» или (у вакансии) «Откликнуться»
  actionLabel: string;
};

export function typeOfAd(ad: Pick<Ad, 'section' | 'kind'>): AdType {
  if (ad.section === 'jobs') return 'job';
  if (ad.section === 'services') return 'service';
  if (ad.kind === 'rent') return 'rent';
  return 'item';
}

const label = <T extends string>(list: readonly { value: T; label: string }[], value: T | null | undefined): string | null => list.find((item) => item.value === value)?.label ?? null;
const labels = <T extends string>(list: readonly { value: T; label: string }[], values: readonly T[]): string | null => {
  const found = list.filter((item) => values.includes(item.value)).map((item) => item.label);
  return found.length > 0 ? found.join(', ') : null;
};
const yesNo = (value: 'yes' | 'no' | null | undefined): string | null => (value === 'yes' ? 'Можно' : value === 'no' ? 'Нельзя' : null);
const money = (value: number) => `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;

// Оставляем только заполненные характеристики
const filled = (specs: readonly (readonly [string, string | null])[]): Spec[] => specs.filter((pair): pair is readonly [string, string] => pair[1] !== null && pair[1] !== '').map(([name, value]) => ({ label: name, value }));

export function buildAdView(ad: Ad, now: Date): AdView {
  const type = typeOfAd(ad);
  const rent = ad.rentDetails ?? null;
  const service = ad.serviceDetails ?? null;
  const job = ad.jobDetails ?? null;

  let specs: Spec[] = [];
  let tag: string | null = null;
  let badges: string[] = [];
  let homeStats: string[] = [];
  let amenities: AdView['amenities'] = [];
  let address: string | null = null;
  let company: string | null = null;
  let where: string | null = ad.district;

  if (type === 'item') {
    tag = ad.trade === 'bargain' ? 'Торг' : ad.trade === 'swap' ? 'Обмен' : null;
    specs = filled([
      ['Категория', categoryLabel(ad.itemCategory, ad.itemSubcategory)],
      ['Состояние', conditionLabel(ad.condition)],
      ['Место встречи', placeLabel(ad.meetingPlace)],
    ]);
  }

  if (type === 'rent' && rent) {
    const rooms = rent.housingType === 'bed' ? null : label(ROOMS_COUNTS, rent.rooms);
    homeStats = [
      rooms === null ? '' : rooms === 'Студия' ? 'Студия' : rooms.endsWith('+') ? `${rooms} комн.` : `${rooms} комн.`,
      rent.area !== null ? `${rent.area} м²` : '',
      rent.floor !== null ? (rent.floors !== null ? `${rent.floor}/${rent.floors} этаж` : `${rent.floor} этаж`) : '',
    ].filter(Boolean);
    specs = filled([
      ['Тип', label(HOUSING_TYPES, rent.housingType)],
      ['Срок', label(RENT_TERM_CHOICES, rent.term)],
      ['Залог', rent.noDeposit ? 'Без залога' : rent.deposit !== null ? money(rent.deposit) : null],
      ['Коммунальные услуги', label(UTILITIES, rent.utilities)],
      ['С кем', label(AUDIENCES, rent.audience)],
      ['Животные', yesNo(rent.pets)],
      ['Курение', yesNo(rent.smoking)],
      ['До университета', rent.timeToUni === null ? null : label(TIMES_TO_UNI, rent.timeToUni)],
    ]);
    amenities = AMENITIES.filter((item) => rent.amenities.includes(item.value));
    address = rent.address;
    where = label(DISTRICTS, rent.district) ?? ad.district;
  }

  if (type === 'service' && service) {
    const category = SERVICE_CATEGORIES.find((item) => item.value === service.category);
    const sub = category?.subs.find((item) => item.value === service.subcategory)?.label;
    specs = filled([
      ['Категория', category ? (sub ? `${category.label} · ${sub}` : category.label) : null],
      ['Для кого', service.audience === null ? null : label(SERVICE_AUDIENCES, service.audience)],
      ['Формат', labels(SERVICE_FORMATS, service.formats)],
      ['Район', label(DISTRICTS, service.district)],
      ['Опыт', service.experience === null ? null : label(EXPERIENCES, service.experience)],
      ['Когда удобно', labels(TIME_SLOTS, service.times)],
    ]);
    where = label(DISTRICTS, service.district) ?? ad.district;
  }

  if (type === 'job' && job) {
    const field = JOB_FIELDS.find((item) => item.value === job.field);
    const sub = field?.subs.find((item) => item.value === job.subfield)?.label;
    company = job.company;
    badges = [
      ...EMPLOYMENTS.filter((item) => job.employment.includes(item.value)).map((item) => item.label),
      label(WORK_FORMATS, job.format) ?? '',
      job.studyFriendly ? 'Можно совмещать с учёбой' : '',
    ].filter(Boolean);
    specs = filled([
      ['Сфера', field ? (sub ? `${field.label} · ${sub}` : field.label) : null],
      ['График', labels(SCHEDULES.filter((item) => item.value !== 'skip'), job.schedule)],
      ['Опыт', label(JOB_EXPERIENCES, job.experience)],
      ['Оформление', job.registration === null ? null : label(REGISTRATIONS, job.registration)],
    ]);
    address = job.address;
    where = label(DISTRICTS, job.district) ?? ad.district;
  }

  const meta = [where, formatPostTime(new Date(ad.createdAt), now)].filter(Boolean).join(' · ');
  return {
    type,
    price: cardPrice(ad),
    tag,
    title: ad.title,
    meta,
    badges,
    homeStats,
    specs,
    amenities,
    address,
    company,
    actionLabel: type === 'job' ? 'Откликнуться' : 'Написать',
  };
}

// «В приложении с ноября 2026»
export function sinceText(since: string | undefined): string | null {
  if (!since) return null;
  const date = new Date(since);
  if (Number.isNaN(date.getTime())) return null;
  // С числом месяц стоит в нужной форме («сентября»); число потом отбрасываем
  const parts = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  return `В приложении с ${month} ${year}`;
}

// «3 объявления»
export function adsCountText(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  const word = lastTwo >= 11 && lastTwo <= 14 ? 'объявлений' : last === 1 ? 'объявление' : last >= 2 && last <= 4 ? 'объявления' : 'объявлений';
  return `${count} ${word}`;
}
