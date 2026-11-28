// Подсказки адресов для формы «Сдать жильё»: поиск по улицам и домам Краснодара и Новой Адыгеи.
// Данные — assets/data/addresses.json (собирается скриптом scripts/build-addresses.py из выгрузки адресного реестра).

export type AddressData = {
  cities: string[];
  // [название улицы, номер города, территория (СНТ, жилой массив…) или '', дома через «|»]
  streets: [string, number, string, string][];
};

export type IndexedStreet = { name: string; city: number; area: string; words: string[]; houses: string[]; norm: string[] };
export type AddressIndex = { cities: string[]; streets: IndexedStreet[] };

// Район, который известен по адресу. В выгрузке районов города нет, поэтому знаем только Новую Адыгею
export type KnownDistrict = 'adygea' | null;

export type Part = { text: string; bold: boolean };
export type Suggestion = {
  key: string;
  kind: 'street' | 'house';
  // Что вставить в поле. У улицы в конце «, »: дальше человек вводит номер дома
  insert: string;
  parts: Part[];
  // Справа серым: «Краснодар» или «тер. Учхоз Кубань жилой массив · Краснодар»
  right: string;
  district: KnownDistrict;
};

// Без регистра и без различия «ё» и «е»
export const norm = (text: string): string => text.toLowerCase().replace(/ё/g, 'е');

// Слова, которые не ищем: типы улиц и служебные («ул.», «улица», «д.», «им.»…)
const NOISE = new Set(['ул', 'улица', 'пер', 'переулок', 'пр', 'проезд', 'пр-д', 'пр-кт', 'проспект', 'б-р', 'бульвар', 'пл', 'площадь', 'туп', 'тупик', 'ш', 'шоссе', 'наб', 'набережная', 'ал', 'аллея', 'с-р', 'сквер', 'дор', 'дорога', 'им', 'имени', 'д', 'дом', 'г', 'город', 'краснодар']);

const TOKEN = /[^\s,.;()]+/g;
const tokens = (text: string): string[] => norm(text).match(TOKEN) ?? [];

// Название улицы без типа и «им.»: слова, по которым ищем
function nameWords(name: string): string[] {
  return tokens(name).filter((word) => !NOISE.has(word));
}

export function buildIndex(data: AddressData): AddressIndex {
  const streets = data.streets.map(([name, city, area, houses]) => {
    const words = nameWords(name);
    return { name, city, area, words, houses: houses === '' ? [] : houses.split('|'), norm: words };
  });
  return { cities: data.cities, streets };
}

// Номер дома: цифры и необязательная буква или дробь («14», «14а», «14/1»); название вроде «1-й» номером не считается
const HOUSE = /^\d+[а-яa-z]?(\/\d+[а-яa-z]?)?$/;

export type ParsedQuery = { words: string[]; house: string | null };

export function parseQuery(query: string): ParsedQuery {
  const all = tokens(query).filter((word) => !NOISE.has(word));
  const last = all[all.length - 1];
  if (all.length >= 2 && last !== undefined && HOUSE.test(last)) return { words: all.slice(0, -1), house: last };
  return { words: all, house: null };
}

const matchesAll = (street: IndexedStreet, words: string[]): boolean => words.every((word) => street.norm.some((own) => own.startsWith(word)));

// Подчёркиваем жирным совпавшие начала слов
export function highlight(text: string, words: string[]): Part[] {
  const bold = new Array<boolean>(text.length).fill(false);
  const used = new Set<number>();
  const found = [...text.matchAll(TOKEN)].map((match) => ({ start: match.index ?? 0, word: norm(match[0]) }));
  for (const query of words) {
    const at = found.findIndex((token, index) => !used.has(index) && token.word.startsWith(query));
    if (at < 0) continue;
    used.add(at);
    const token = found[at] as { start: number; word: string };
    for (let i = token.start; i < token.start + query.length; i++) bold[i] = true;
  }
  const parts: Part[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.bold === bold[i]) last.text += text[i];
    else parts.push({ text: text[i] as string, bold: bold[i] as boolean });
  }
  return parts;
}

const rightOf = (index: AddressIndex, street: IndexedStreet): string => {
  const city = index.cities[street.city] ?? '';
  return street.area ? `${street.area} · ${city}` : city;
};
const districtOf = (street: IndexedStreet): KnownDistrict => (street.city === 1 ? 'adygea' : null);

// null — запрос слишком короткий или в нём нет слов для поиска (список не показываем); [] — ничего не найдено
export function searchAddresses(index: AddressIndex, query: string, limit = 8): Suggestion[] | null {
  if (query.trim().length < 2) return null;
  const { words, house } = parseQuery(query);
  if (words.length === 0) return null;
  const first = words[0] as string;

  const matched = index.streets
    .filter((street) => matchesAll(street, words))
    // Сначала улицы, где первое слово запроса — первое слово названия; потом короче, потом те, где больше домов
    .sort((a, b) => Number(b.norm[0]?.startsWith(first)) - Number(a.norm[0]?.startsWith(first)) || a.name.length - b.name.length || b.houses.length - a.houses.length);

  const out: Suggestion[] = [];
  if (house === null) {
    for (const street of matched.slice(0, limit)) {
      out.push({ key: `s:${street.city}:${street.area}:${street.name}`, kind: 'street', insert: `${street.name}, `, parts: highlight(street.name, words), right: rightOf(index, street), district: districtOf(street) });
    }
    return out;
  }
  // Улица и номер: подсказываем дома
  for (const street of matched) {
    for (const number of street.houses) {
      if (!norm(number).startsWith(house)) continue;
      const text = `${street.name}, ${number}`;
      out.push({ key: `h:${street.city}:${street.area}:${text}`, kind: 'house', insert: text, parts: highlight(text, [...words, house]), right: rightOf(index, street), district: districtOf(street) });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// Данные грузим при первом обращении (файл около 650 КБ), а не при запуске приложения
let loaded: AddressIndex | null = null;
export function getAddressIndex(): AddressIndex {
  if (!loaded) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = buildIndex(require('../../../assets/data/addresses.json') as AddressData);
  }
  return loaded;
}
