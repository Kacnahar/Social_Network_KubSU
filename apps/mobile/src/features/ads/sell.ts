// Форма «Продать вещь»: категории, состояния и проверки. Сервера для объявлений пока нет — всё живёт в приложении.
import type { Messenger } from './contact';

export type ItemCategory = string;
export type ItemCondition = 'new' | 'used';
export type MeetingPlace = 'campus' | 'dorm1' | 'dorm2' | 'dorm3' | 'dorm4' | 'dorm5';

type Named = { value: string; label: string };
const named = (items: readonly string[]): Named[] => items.map((label, index) => ({ value: String(index), label }));

// Категории с подкатегориями. У «Другого» подкатегорий нет — оно выбирается сразу.
export const ITEM_CATEGORIES: readonly { value: ItemCategory; label: string; subs: readonly Named[] }[] = [
  { value: 'books', label: 'Учебники и книги', subs: named(['Учебники', 'Конспекты и методички', 'Художественная литература', 'Словари и справочники', 'Другое']) },
  { value: 'stationery', label: 'Канцелярия и для учёбы', subs: named(['Тетради и блокноты', 'Ручки и карандаши', 'Калькуляторы', 'Чертёжные принадлежности', 'Рюкзаки и пеналы']) },
  { value: 'electronics', label: 'Электроника', subs: named(['Наушники и колонки', 'Планшеты и электронные книги', 'Фото и видео', 'Умные часы и браслеты', 'Другое']) },
  { value: 'computers', label: 'Компьютеры и комплектующие', subs: named(['Ноутбуки', 'Мониторы', 'Клавиатуры и мыши', 'Комплектующие', 'Кабели и переходники']) },
  { value: 'phones', label: 'Телефоны и аксессуары', subs: named(['Смартфоны', 'Чехлы и защитные стёкла', 'Зарядки и кабели', 'Повербанки', 'Другое']) },
  { value: 'clothes', label: 'Одежда и обувь', subs: named(['Верхняя одежда', 'Кофты и футболки', 'Брюки и джинсы', 'Обувь', 'Спортивная одежда']) },
  { value: 'accessories', label: 'Аксессуары и сумки', subs: named(['Сумки и рюкзаки', 'Часы', 'Украшения', 'Шарфы и шапки', 'Очки']) },
  { value: 'home', label: 'Для дома и общежития', subs: named(['Мебель', 'Посуда', 'Постельное бельё', 'Освещение', 'Хранение и организация']) },
  { value: 'appliances', label: 'Бытовая техника', subs: named(['Холодильники', 'Чайники и микроволновки', 'Стиральные машины', 'Обогреватели и вентиляторы', 'Другое']) },
  { value: 'sport', label: 'Спорт и отдых', subs: named(['Велосипеды и самокаты', 'Тренажёры и гантели', 'Командные виды спорта', 'Туризм и кемпинг', 'Другое']) },
  { value: 'beauty', label: 'Красота и здоровье', subs: named(['Уход за кожей', 'Косметика', 'Парфюмерия', 'Приборы для ухода', 'Другое']) },
  { value: 'hobby', label: 'Хобби и творчество', subs: named(['Настольные игры', 'Рукоделие', 'Рисование', 'Конструкторы', 'Другое']) },
  { value: 'music', label: 'Музыкальные инструменты', subs: named(['Гитары', 'Клавишные', 'Ударные', 'Аксессуары', 'Другое']) },
  { value: 'tickets', label: 'Билеты и мероприятия', subs: named(['Концерты', 'Театр и кино', 'Спортивные события', 'Вечеринки', 'Другое']) },
  { value: 'other', label: 'Другое', subs: [] },
];

export const ITEM_CONDITIONS: readonly { value: ItemCondition; label: string }[] = [
  { value: 'new', label: 'Новое' },
  { value: 'used', label: 'Б/У' },
];

// Название университета в тексте пока не используем (правило проекта), поэтому «Университет»
export const MEETING_PLACES: readonly { value: MeetingPlace; label: string }[] = [
  { value: 'campus', label: 'Университет' },
  { value: 'dorm1', label: 'Общежитие 1' },
  { value: 'dorm2', label: 'Общежитие 2' },
  { value: 'dorm3', label: 'Общежитие 3' },
  { value: 'dorm4', label: 'Общежитие 4' },
  { value: 'dorm5', label: 'Общежитие 5' },
];

export const conditionLabel = (value: ItemCondition | null | undefined) => ITEM_CONDITIONS.find((item) => item.value === value)?.label ?? null;
export const placeLabel = (value: MeetingPlace | null | undefined) => MEETING_PLACES.find((item) => item.value === value)?.label ?? null;

// «Электроника · Фото и видео» (у «Другого» — только «Другое»)
export function categoryLabel(category: ItemCategory | null | undefined, sub: string | null | undefined = null): string | null {
  const found = ITEM_CATEGORIES.find((item) => item.value === category);
  if (!found) return null;
  const subLabel = found.subs.find((item) => item.value === sub)?.label;
  return subLabel ? `${found.label} · ${subLabel}` : found.label;
}

export const SELL_TITLE_MAX = 60;
export const SELL_DESCRIPTION_MAX = 3000;
export const SELL_PHOTOS_MAX = 10;
export const SELL_PRICE_DIGITS = 9;

// Из того, что набрано в поле цены, оставляем только цифры (без ведущих нулей, не больше 9 знаков)
export const digitsOf = (text: string): string => text.replace(/\D/g, '').replace(/^0+/, '').slice(0, SELL_PRICE_DIGITS);

// «1200» → «1 200»
export const groupDigits = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export type SellDraft = {
  photos: string[];
  title: string;
  price: string;
  negotiable: boolean;
  category: ItemCategory | null;
  subcategory: string | null;
  condition: ItemCondition | null;
  place: MeetingPlace | null;
  // Телефон для связи (10 цифр без +7) и мессенджеры на этом номере
  phone: string;
  messengers: Messenger[];
  description: string;
};

export const emptySellDraft = (): SellDraft => ({ photos: [], title: '', price: '', negotiable: false, category: null, subcategory: null, condition: null, place: null, phone: '', messengers: [], description: '' });

// «Опубликовать» доступна, когда есть название, цена (или «Договорная») и категория
export const isSellReady = (draft: SellDraft): boolean =>
  draft.title.trim() !== '' && (draft.negotiable || Number(draft.price) > 0) && draft.category !== null;

// Что-то уже заполнено — при выходе спрашиваем, не потеряются ли данные
export const isSellTouched = (draft: SellDraft): boolean =>
  draft.photos.length > 0 || draft.title.trim() !== '' || draft.price !== '' || draft.negotiable || draft.category !== null || draft.condition !== null || draft.place !== null || draft.phone !== '' || draft.messengers.length > 0 || draft.description.trim() !== '';

// Переставить фото: from → to (остальные сдвигаются)
export function movePhoto<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item as T);
  return next;
}
