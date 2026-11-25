// ТЕСТОВЫЕ данные для экрана «Друзья»: выдуманные люди, никаких запросов к серверу.
// Друзей на сервере нет и в плане нет (CLAUDE.md, жёсткое правило 8).

// addedAt — когда человек стал другом (или прислал заявку), в миллисекундах; нужен для сортировки «новые / старые»
export type Person = { id: string; nickname: string; name: string; faculty: string; addedAt: number; profileId?: string };

const FIRST = ['Анна', 'Дарья', 'Михаил', 'Елена', 'Артём', 'Софья', 'Иван', 'Мария', 'Никита', 'Алиса', 'Егор', 'Полина', 'Кирилл', 'Ксения', 'Тимур', 'Вера'];
const LAST = ['Иванова', 'Ким', 'Орлов', 'Сафонова', 'Громов', 'Лебедева', 'Петров', 'Соколова', 'Волков', 'Миронова', 'Белов', 'Фёдорова', 'Захаров', 'Крылова', 'Назаров', 'Зайцева'];
const FACULTIES = ['ФКТиПМ', 'ФМиКН', 'ФТФ', 'РГФ', 'ХГФ', 'ФППК', 'ФУП', 'ФИСМО'];

const LETTERS: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

// «Анна Иванова» → «anna.ivanova»
export const translit = (text: string): string =>
  Array.from(text.toLowerCase()).map((letter) => LETTERS[letter] ?? letter).join('');

export const nicknameFor = (first: string, last: string): string => `${translit(first)}.${translit(last)}`;

const DAY = 86_400_000;
const NOW = Date.now();

const make = (index: number, faculty?: string): Person => {
  const first = FIRST[index % 16] ?? 'Иван';
  const last = LAST[(index * 5 + Math.floor(index / 16)) % 16] ?? 'Петров';
  return { id: `t${index}`, nickname: nicknameFor(first, last), name: `${first} ${last}`, faculty: faculty ?? FACULTIES[index % FACULTIES.length] ?? '', addedAt: NOW - index * 3 * DAY };
};

// 128 друзей, чтобы показать длинный список
export const TEST_FRIENDS: Person[] = Array.from({ length: 128 }, (_, index) => make(index));
export const TEST_REQUESTS: Person[] = [make(40), make(57), make(73)].map((person, index) => ({ ...person, id: `r${index}`, addedAt: NOW - (index + 1) * 3_600_000 }));
// «Возможно, знакомы»: люди с того же факультета, что и вы
export const testSuggestions = (faculty: string): Person[] => [7, 19, 26, 33, 50].map((index) => ({ ...make(index + 200, faculty), id: `s${index}` }));
