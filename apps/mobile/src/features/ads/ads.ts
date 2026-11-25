// Каталог: объявления, книги, услуги, вакансии. Сервера для них пока нет: всё живёт в памяти приложения
// и пропадает при перезапуске. Список того, что нужно от сервера, — в описании задачи.

export type AdSection = 'ads' | 'books' | 'services' | 'jobs';
export type AdKind = 'buy' | 'sell' | 'rent' | 'give' | 'swap';
export type RentTerm = 'monthly' | 'daily';

export const AD_SECTIONS: readonly { value: AdSection; label: string; caption: string; newTitle: string }[] = [
  { value: 'ads', label: 'Объявления', caption: 'Купить, продать, аренда жилья', newTitle: 'Новое объявление' },
  { value: 'books', label: 'Книги', caption: 'Учебники: продать, отдать, обменять', newTitle: 'Новая книга' },
  { value: 'services', label: 'Услуги', caption: 'Репетиторство, помощь с учёбой', newTitle: 'Новая услуга' },
  { value: 'jobs', label: 'Вакансии', caption: 'Подработка и стажировки', newTitle: 'Новая вакансия' },
];

export const SECTION_LABEL: Record<AdSection, string> = { ads: 'Объявления', books: 'Книги', services: 'Услуги', jobs: 'Вакансии' };

export const KIND_LABEL: Record<AdKind, string> = {
  buy: 'Купить',
  sell: 'Продать',
  rent: 'Аренда жилья',
  give: 'Отдать',
  swap: 'Обменять',
};

// Типы внутри раздела: они же чипы-фильтры в списке и выбор типа в форме. У услуг и вакансий типов нет
export const SECTION_KINDS: Record<AdSection, readonly AdKind[]> = {
  ads: ['buy', 'sell', 'rent'],
  books: ['sell', 'give', 'swap'],
  services: [],
  jobs: [],
};

export const kindOptions = (section: AdSection): { value: AdKind; label: string }[] =>
  SECTION_KINDS[section].map((value) => ({ value, label: KIND_LABEL[value] }));

export const isSection = (value: unknown): value is AdSection => value === 'ads' || value === 'books' || value === 'services' || value === 'jobs';

export const RENT_TERMS: readonly { value: RentTerm; label: string }[] = [
  { value: 'monthly', label: 'Помесячно' },
  { value: 'daily', label: 'Посуточно' },
];

export const AD_TITLE_MAX = 80;
export const AD_DESCRIPTION_MAX = 1000;
export const AD_DISTRICT_MAX = 60;
export const AD_PHOTOS_MAX = 10;
export const AD_PRICE_MAX = 100_000_000;

export type Ad = {
  adId: string;
  section: AdSection;
  // null — у раздела типов нет
  kind: AdKind | null;
  title: string;
  description: string;
  // null — цена договорная
  price: number | null;
  // Только аренда жилья: район и срок
  district: string | null;
  rentTerm: RentTerm | null;
  // Адреса фото; у тестовых объявлений фото нет — вместо них плашка с иконкой раздела
  photos: string[];
  author: { profileId: string | null; displayName: string; avatarUrl: string | null };
  createdAt: string;
};

// Категории раздела «Объявления» (чипы): типы объявлений, а «Услуги» и «Вакансии» стали категориями внутри него.
// Книги из каталога скрыты, их данные и код остались.
export type AdCategory = 'buy' | 'sell' | 'rent' | 'services' | 'jobs';

export const AD_CATEGORIES: readonly { value: AdCategory; label: string; section: AdSection; kind: AdKind | null }[] = [
  { value: 'buy', label: 'Купить', section: 'ads', kind: 'buy' },
  { value: 'sell', label: 'Продать', section: 'ads', kind: 'sell' },
  { value: 'rent', label: 'Аренда жилья', section: 'ads', kind: 'rent' },
  { value: 'services', label: 'Услуги', section: 'services', kind: null },
  { value: 'jobs', label: 'Вакансии', section: 'jobs', kind: null },
];

// Заголовки форм «Новое объявление» по категориям
export const NEW_AD_TITLE: Record<AdCategory, string> = {
  buy: 'Куплю',
  sell: 'Продать вещь',
  rent: 'Сдать жильё',
  services: 'Предложить услугу',
  jobs: 'Разместить вакансию',
};

export const isCategory = (value: unknown): value is AdCategory => AD_CATEGORIES.some((item) => item.value === value);

export const categoryOfAd = (ad: Pick<Ad, 'section' | 'kind'>): AdCategory | null =>
  ad.section === 'ads' ? (ad.kind === 'buy' || ad.kind === 'sell' || ad.kind === 'rent' ? ad.kind : null) : ad.section === 'services' || ad.section === 'jobs' ? ad.section : null;

// Список «Объявлений»: выбранная категория (null — все) и поиск; книги сюда не попадают
export function filterByCategory(ads: readonly Ad[], category: AdCategory | null, query: string): Ad[] {
  return filterAds(ads, null, null, query).filter((ad) => {
    const own = categoryOfAd(ad);
    return own !== null && (category === null || own === category);
  });
}

// Фильтр списка: раздел (null — все), тип (null — все) и поиск по названию и описанию
export function filterAds(ads: readonly Ad[], section: AdSection | null, kind: AdKind | null, query: string): Ad[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return ads.filter((ad) => {
    if (section && ad.section !== section) return false;
    if (kind && ad.kind !== kind) return false;
    const text = `${ad.title} ${ad.description} ${ad.district ?? ''}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

// «1 500 ₽» или «Договорная»
export function formatPrice(price: number | null): string {
  if (price === null) return 'Договорная';
  return `${String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
}

// Цена объявления: «Бесплатно» у того, что отдают; у аренды с припиской «/ мес.» или «/ сутки»
export function formatAdPrice(ad: Pick<Ad, 'price' | 'kind' | 'rentTerm'>): string {
  if (ad.kind === 'give') return 'Бесплатно';
  const price = formatPrice(ad.price);
  if (ad.kind !== 'rent' || ad.price === null) return price;
  return `${price} / ${ad.rentTerm === 'daily' ? 'сутки' : 'мес.'}`;
}

export type AdDraft = {
  section: AdSection;
  kind: AdKind | null;
  title: string;
  description: string;
  price: string;
  negotiable: boolean;
  district: string;
  rentTerm: RentTerm;
};

export type AdDraftField = 'kind' | 'title' | 'description' | 'price' | 'district';
export type AdDraftErrors = Partial<Record<AdDraftField, string>>;

export const emptyAdDraft = (section: AdSection): AdDraft => ({
  section,
  kind: null,
  title: '',
  description: '',
  price: '',
  negotiable: false,
  district: '',
  rentTerm: 'monthly',
});

export const isRent = (draft: Pick<AdDraft, 'section' | 'kind'>) => draft.section === 'ads' && draft.kind === 'rent';

// Книгу отдают бесплатно — цену не спрашиваем
export const isFree = (draft: Pick<AdDraft, 'section' | 'kind'>) => draft.section === 'books' && draft.kind === 'give';

export function validateAdDraft(draft: AdDraft): AdDraftErrors {
  const errors: AdDraftErrors = {};
  if (SECTION_KINDS[draft.section].length > 0 && !draft.kind) errors.kind = 'Выберите тип';

  const title = draft.title.trim();
  if (title === '') errors.title = 'Введите название';
  else if (title.length > AD_TITLE_MAX) errors.title = `Не длиннее ${AD_TITLE_MAX} знаков`;

  const description = draft.description.trim();
  if (description === '') errors.description = 'Опишите объявление';
  else if (description.length > AD_DESCRIPTION_MAX) errors.description = `Не длиннее ${AD_DESCRIPTION_MAX} знаков`;

  const rent = isRent(draft);
  if (rent) {
    const district = draft.district.trim();
    if (district === '') errors.district = 'Укажите район';
    else if (district.length > AD_DISTRICT_MAX) errors.district = `Не длиннее ${AD_DISTRICT_MAX} знаков`;
  }

  // У аренды цена обязательна всегда: «договорной» аренды не бывает
  if (!isFree(draft) && (rent || !draft.negotiable)) {
    const price = draft.price.trim();
    if (price === '') errors.price = rent ? 'Укажите цену' : 'Укажите цену или отметьте «Договорная»';
    else if (!/^\d+$/.test(price)) errors.price = 'Только цифры';
    else if (Number(price) <= 0) errors.price = 'Цена больше нуля';
    else if (Number(price) > AD_PRICE_MAX) errors.price = 'Слишком большая цена';
  }
  return errors;
}

// Цена из черновика: число или null для «Договорная»
export const priceOf = (draft: AdDraft): number | null =>
  isFree(draft) || (!isRent(draft) && draft.negotiable) ? null : Number(draft.price.trim());
