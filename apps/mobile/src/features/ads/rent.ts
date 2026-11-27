// Форма «Сдать жильё»: варианты выбора, проверки и подпись объявления. Сервера для объявлений пока нет — всё живёт в приложении.
import type { Messenger } from './contact';
import { SELL_DESCRIPTION_MAX } from './sell';

export type HousingType = 'flat' | 'room' | 'bed' | 'house';
export type TimeToUni = 'm10' | 'm20' | 'm40' | 'm40plus' | 'skip';
export type RentTermChoice = 'long' | 'daily' | 'semester';
export type RoomsCount = 'studio' | 'r1' | 'r2' | 'r3' | 'r4plus';
export type Utilities = 'included' | 'separate';
export type Audience = 'one' | 'roommate' | 'girls' | 'boys' | 'any';
export type Amenity = 'furniture' | 'wifi' | 'washer' | 'fridge' | 'ac';
export type YesNo = 'yes' | 'no';
export type DistrictChoice = 'west' | 'center' | 'prikuban' | 'karasun' | 'adygea' | 'berezovsky' | 'elizavetinsky' | 'kalininsky' | 'pashkovsky' | 'starokorsunsky' | 'dinskoy' | 'skip';

export const HOUSING_TYPES: readonly { value: HousingType; label: string }[] = [
  { value: 'flat', label: 'Квартира' },
  { value: 'room', label: 'Комната' },
  { value: 'bed', label: 'Койко-место' },
  { value: 'house', label: 'Дом' },
];

// Название вуза в тексте пока не используем (правило проекта), поэтому «университета»
export const TIMES_TO_UNI: readonly { value: TimeToUni; label: string }[] = [
  { value: 'm10', label: 'До 10 минут' },
  { value: 'm20', label: '10–20 минут' },
  { value: 'm40', label: '20–40 минут' },
  { value: 'm40plus', label: 'Больше 40 минут' },
  // Выбрали — в объявлении строки «время до университета» нет
  { value: 'skip', label: 'Не указать' },
];

export const DISTRICTS: readonly { value: DistrictChoice; label: string }[] = [
  { value: 'west', label: 'Западный' },
  { value: 'center', label: 'Центральный' },
  { value: 'prikuban', label: 'Прикубанский' },
  { value: 'karasun', label: 'Карасунский' },
  { value: 'adygea', label: 'Новая Адыгея' },
  { value: 'berezovsky', label: 'Берёзовский сельский округ' },
  { value: 'elizavetinsky', label: 'Елизаветинский сельский округ' },
  { value: 'kalininsky', label: 'Калининский сельский округ' },
  { value: 'pashkovsky', label: 'Пашковский сельский округ' },
  { value: 'starokorsunsky', label: 'Старокорсунский сельский округ' },
  { value: 'dinskoy', label: 'Динской район' },
  // Выбрали — в объявлении район не показываем
  { value: 'skip', label: 'Не указать' },
];

export const RENT_TERM_CHOICES: readonly { value: RentTermChoice; label: string }[] = [
  { value: 'long', label: 'Длительно' },
  { value: 'daily', label: 'Посуточно' },
  { value: 'semester', label: 'На семестр' },
];

export const ROOMS_COUNTS: readonly { value: RoomsCount; label: string }[] = [
  { value: 'studio', label: 'Студия' },
  { value: 'r1', label: '1' },
  { value: 'r2', label: '2' },
  { value: 'r3', label: '3' },
  { value: 'r4plus', label: '4+' },
];

export const UTILITIES: readonly { value: Utilities; label: string }[] = [
  { value: 'included', label: 'Включены в цену' },
  { value: 'separate', label: 'Оплачиваются отдельно' },
];

export const AUDIENCES: readonly { value: Audience; label: string }[] = [
  { value: 'one', label: 'Одному' },
  { value: 'roommate', label: 'Ищу соседа' },
  { value: 'girls', label: 'Только девушкам' },
  { value: 'boys', label: 'Только парням' },
  { value: 'any', label: 'Не важно' },
];

export const AMENITIES: readonly { value: Amenity; label: string }[] = [
  { value: 'furniture', label: 'Мебель' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'washer', label: 'Стиральная машина' },
  { value: 'fridge', label: 'Холодильник' },
  { value: 'ac', label: 'Кондиционер' },
];

export const YES_NO: readonly { value: YesNo; label: string }[] = [
  { value: 'yes', label: 'Да' },
  { value: 'no', label: 'Нет' },
];

export const RENT_ADDRESS_MAX = 80;
export const RENT_DESCRIPTION_MAX = SELL_DESCRIPTION_MAX;

export type RentDraft = {
  photos: string[];
  housingType: HousingType | null;
  price: string;
  negotiable: boolean;
  address: string;
  district: DistrictChoice | null;
  timeToUni: TimeToUni | null;
  term: RentTermChoice | null;
  rooms: RoomsCount | null;
  area: string;
  floor: string;
  floors: string;
  deposit: string;
  noDeposit: boolean;
  utilities: Utilities | null;
  audience: Audience | null;
  amenities: Amenity[];
  pets: YesNo | null;
  smoking: YesNo | null;
  phone: string;
  messengers: Messenger[];
  description: string;
};

// Какие строки скрыты у типа жилья: у койко-места нет «Комнат» и «Площади», у дома — «Этажа» и «Этажей в доме».
// Значение скрытой строки не учитывается при публикации
export const hidesRooms = (type: HousingType | null): boolean => type === 'bed';
export const hidesFloors = (type: HousingType | null): boolean => type === 'house';

// Всё, что хранится у объявления о жилье кроме общих полей
export type RentDetails = {
  housingType: HousingType;
  address: string;
  // null — «Не указать» или район не выбран: в объявлении района нет
  district: Exclude<DistrictChoice, 'skip'> | null;
  // null — «Не указать»: строку в объявлении не показываем
  timeToUni: Exclude<TimeToUni, 'skip'> | null;
  term: RentTermChoice;
  rooms: RoomsCount | null;
  area: number | null;
  floor: number | null;
  floors: number | null;
  // null — суммы нет; noDeposit — залога точно нет
  deposit: number | null;
  noDeposit: boolean;
  utilities: Utilities | null;
  audience: Audience | null;
  amenities: Amenity[];
  pets: YesNo | null;
  smoking: YesNo | null;
};

export const emptyRentDraft = (): RentDraft => ({
  photos: [],
  housingType: null,
  price: '',
  negotiable: false,
  address: '',
  district: null,
  timeToUni: null,
  term: null,
  rooms: null,
  area: '',
  floor: '',
  floors: '',
  deposit: '',
  noDeposit: false,
  utilities: null,
  audience: null,
  amenities: [],
  pets: null,
  smoking: null,
  phone: '',
  messengers: [],
  description: '',
});

// «Опубликовать» ждёт: хотя бы одно фото, тип жилья, цену (или «Договорная»), адрес, время до университета и срок
export const isRentReady = (draft: RentDraft): boolean =>
  draft.photos.length > 0 &&
  draft.housingType !== null &&
  (draft.negotiable || Number(draft.price) > 0) &&
  draft.address.trim() !== '' &&
  draft.timeToUni !== null &&
  draft.term !== null;

export const isRentTouched = (draft: RentDraft): boolean => {
  const empty = emptyRentDraft();
  return (Object.keys(empty) as (keyof RentDraft)[]).some((key) => {
    const value = draft[key];
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return value !== empty[key];
  });
};

// Цена: за месяц, а при «Посуточно» — за сутки (так её показывает карточка)
export const rentPriceLabel = (term: RentTermChoice | null): string => (term === 'daily' ? 'Цена за сутки' : 'Цена в месяц');
export const rentTermOf = (term: RentTermChoice | null): 'monthly' | 'daily' => (term === 'daily' ? 'daily' : 'monthly');

const number = (text: string): number | null => (text.trim() === '' ? null : Number(text));

export function toRentDetails(draft: RentDraft): RentDetails {
  const noRooms = hidesRooms(draft.housingType);
  const noFloors = hidesFloors(draft.housingType);
  return {
    housingType: draft.housingType as HousingType,
    address: draft.address.trim(),
    district: draft.district === null || draft.district === 'skip' ? null : draft.district,
    timeToUni: draft.timeToUni === 'skip' ? null : (draft.timeToUni as Exclude<TimeToUni, 'skip'>),
    term: draft.term as RentTermChoice,
    rooms: noRooms ? null : draft.rooms,
    area: noRooms ? null : number(draft.area),
    floor: noFloors ? null : number(draft.floor),
    floors: noFloors ? null : number(draft.floors),
    deposit: draft.noDeposit ? null : number(draft.deposit),
    noDeposit: draft.noDeposit,
    utilities: draft.utilities,
    audience: draft.audience,
    amenities: draft.amenities,
    pets: draft.pets,
    smoking: draft.smoking,
  };
}

const ROOMS_TITLE: Record<RoomsCount, string> = { studio: 'студия', r1: '1-комн.', r2: '2-комн.', r3: '3-комн.', r4plus: '4+ комн.' };

// У формы нет поля «Название», поэтому заголовок объявления собираем: «Квартира, 2-комн., 45 м²»
export function rentTitle(draft: Pick<RentDraft, 'housingType' | 'rooms' | 'area'>): string {
  const type = HOUSING_TYPES.find((item) => item.value === draft.housingType)?.label ?? 'Жильё';
  const parts = [type];
  if (draft.rooms && !hidesRooms(draft.housingType)) parts.push(ROOMS_TITLE[draft.rooms]);
  if (draft.area.trim() !== '' && !hidesRooms(draft.housingType)) parts.push(`${draft.area} м²`);
  return parts.join(', ');
}

// «Мебель, Wi-Fi +2»: первые значения и сколько ещё выбрано
export function summarize(labels: readonly string[], shown = 2): string {
  if (labels.length <= shown) return labels.join(', ');
  return `${labels.slice(0, shown).join(', ')} +${labels.length - shown}`;
}

// Что показать на карточке как «место»: район, а если его нет — адрес
export const districtLabel = (district: DistrictChoice | null): string | null => (district === null || district === 'skip' ? null : (DISTRICTS.find((item) => item.value === district)?.label ?? null));
