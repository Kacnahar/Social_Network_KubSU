// Форма «Предложить услугу»: категории, варианты выбора и проверки. Сервера для объявлений пока нет — всё живёт в приложении.
import type { Messenger } from './contact';
import type { DistrictChoice } from './rent';

export type PriceUnit = 'hour' | 'lesson' | 'job' | 'from';
export type ServiceFormat = 'online' | 'home' | 'visit' | 'campus';
export type Experience = 'under1' | 'y1to3' | 'over3' | 'skip';
export type TimeSlot = 'weekdays' | 'weekend' | 'day' | 'evening' | 'agree' | 'skip';
export type ServiceAudience = 'boys' | 'girls' | 'all' | 'skip';

type Named = { value: string; label: string };
const named = (items: readonly string[]): Named[] => items.map((label, index) => ({ value: String(index), label }));

// Категории услуг с подкатегориями; у «Другого» подкатегорий нет — оно выбирается сразу
export const SERVICE_CATEGORIES: readonly { value: string; label: string; subs: readonly Named[] }[] = [
  { value: 'study', label: 'Учёба', subs: named(['Репетиторство', 'Помощь с курсовыми', 'Переводы', 'Подготовка к экзаменам']) },
  { value: 'beauty', label: 'Красота', subs: named(['Маникюр', 'Стрижки', 'Макияж', 'Брови и ресницы']) },
  { value: 'it', label: 'IT и дизайн', subs: named(['Сайты', 'Программирование', 'Дизайн', 'Настройка компьютера']) },
  { value: 'media', label: 'Фото и видео', subs: named(['Фотосъёмка', 'Видеосъёмка', 'Монтаж']) },
  { value: 'repair', label: 'Ремонт техники', subs: named(['Телефоны', 'Ноутбуки', 'Другое']) },
  { value: 'moving', label: 'Уборка и переезд', subs: named(['Уборка', 'Помощь с переездом', 'Грузчики']) },
  { value: 'sport', label: 'Спорт', subs: named(['Тренировки', 'Йога', 'Единоборства']) },
  { value: 'other', label: 'Другое', subs: [] },
];

export const PRICE_UNITS: readonly { value: PriceUnit; label: string }[] = [
  { value: 'hour', label: 'за час' },
  { value: 'lesson', label: 'за занятие' },
  { value: 'job', label: 'за работу' },
  { value: 'from', label: 'от' },
];

// Название вуза в тексте пока не используем (правило проекта), поэтому «В университете»
export const SERVICE_FORMATS: readonly { value: ServiceFormat; label: string }[] = [
  { value: 'online', label: 'Онлайн' },
  { value: 'home', label: 'У меня' },
  { value: 'visit', label: 'Выезд к клиенту' },
  { value: 'campus', label: 'В университете' },
];

export const EXPERIENCES: readonly { value: Experience; label: string }[] = [
  { value: 'under1', label: 'До 1 года' },
  { value: 'y1to3', label: '1–3 года' },
  { value: 'over3', label: 'Больше 3 лет' },
  { value: 'skip', label: 'Не указать' },
];

// «Когда удобно»: три группы (между группами в окне тонкая линия); «Не указать» снимает остальные галочки
export const TIME_SLOTS: readonly { value: TimeSlot; label: string; group: number }[] = [
  { value: 'weekdays', label: 'Будни', group: 0 },
  { value: 'weekend', label: 'Выходные', group: 0 },
  { value: 'day', label: 'Днём', group: 1 },
  { value: 'evening', label: 'Вечером', group: 1 },
  { value: 'agree', label: 'По договорённости', group: 2 },
  { value: 'skip', label: 'Не указать', group: 2 },
];

export const SERVICE_AUDIENCES: readonly { value: ServiceAudience; label: string }[] = [
  { value: 'boys', label: 'Для парней' },
  { value: 'girls', label: 'Для девушек' },
  { value: 'all', label: 'Для всех' },
  { value: 'skip', label: 'Не указать' },
];

// «Для кого» спрашиваем только у учёбы и красоты
export const asksAudience = (category: string | null): boolean => category === 'study' || category === 'beauty';

export const SERVICE_TITLE_MAX = 60;

export type ServiceDraft = {
  photos: string[];
  title: string;
  category: string | null;
  subcategory: string | null;
  price: string;
  negotiable: boolean;
  unit: PriceUnit;
  formats: ServiceFormat[];
  district: DistrictChoice | null;
  experience: Experience | null;
  times: TimeSlot[];
  audience: ServiceAudience | null;
  phone: string;
  messengers: Messenger[];
  description: string;
};

export type ServiceDetails = {
  category: string;
  subcategory: string | null;
  // null — цена договорная
  priceUnit: PriceUnit | null;
  formats: ServiceFormat[];
  district: Exclude<DistrictChoice, 'skip'> | null;
  experience: Exclude<Experience, 'skip'> | null;
  times: Exclude<TimeSlot, 'skip'>[];
  audience: Exclude<ServiceAudience, 'skip'> | null;
};

export const emptyServiceDraft = (): ServiceDraft => ({
  photos: [],
  title: '',
  category: null,
  subcategory: null,
  price: '',
  negotiable: false,
  unit: 'hour',
  formats: [],
  district: null,
  experience: null,
  times: [],
  audience: null,
  phone: '',
  messengers: [],
  description: '',
});

// «Опубликовать» ждёт название, категорию и цену (или «Договорная»); фото и остальное — по желанию
export const isServiceReady = (draft: ServiceDraft): boolean => draft.title.trim() !== '' && draft.category !== null && (draft.negotiable || Number(draft.price) > 0);

export const isServiceTouched = (draft: ServiceDraft): boolean => {
  const empty = emptyServiceDraft();
  return (Object.keys(empty) as (keyof ServiceDraft)[]).some((key) => {
    const value = draft[key];
    // Строки (в том числе единица цены «за час» по умолчанию) сравниваем с пустой формой
    if (typeof value === 'string') return value.trim() !== (empty[key] as string);
    if (Array.isArray(value)) return value.length > 0;
    return value !== empty[key];
  });
};

// Район спрашиваем только у тех, кто принимает «У меня»; иначе строку скрываем, значение не учитываем
export const showsDistrict = (formats: readonly ServiceFormat[]): boolean => formats.includes('home');
export const onlyOnline = (formats: readonly ServiceFormat[]): boolean => formats.length === 1 && formats[0] === 'online';

export function toServiceDetails(draft: ServiceDraft): ServiceDetails {
  return {
    category: draft.category as string,
    subcategory: draft.subcategory,
    priceUnit: draft.negotiable ? null : draft.unit,
    formats: draft.formats,
    district: !showsDistrict(draft.formats) || draft.district === null || draft.district === 'skip' ? null : draft.district,
    experience: draft.experience === null || draft.experience === 'skip' ? null : draft.experience,
    times: draft.times.filter((slot): slot is Exclude<TimeSlot, 'skip'> => slot !== 'skip'),
    audience: !asksAudience(draft.category) || draft.audience === null || draft.audience === 'skip' ? null : draft.audience,
  };
}

// Цена с единицей: «600 ₽ / час», «от 500 ₽», «1 200 ₽ / занятие», «1 500 ₽ / работа»
export function formatServicePrice(price: number | null, unit: PriceUnit | null | undefined): string | null {
  if (price === null) return null;
  const amount = `${String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
  if (unit === 'from') return `от ${amount}`;
  if (unit === 'hour') return `${amount} / час`;
  if (unit === 'lesson') return `${amount} / занятие`;
  if (unit === 'job') return `${amount} / работа`;
  return amount;
}

// Что показать на карточке как «место»: район, «Онлайн», если только онлайн, иначе ничего
export const serviceWhere = (formats: readonly ServiceFormat[], districtText: string | null): string | null => districtText ?? (onlyOnline(formats) ? 'Онлайн' : null);
