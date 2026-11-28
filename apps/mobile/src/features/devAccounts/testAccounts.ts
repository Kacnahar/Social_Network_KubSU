// ТЕСТОВЫЕ аккаунты для разработки (только в режиме __DEV__; в настоящую сборку этот файл не попадает).
// Они создаются на ЛОКАЛЬНОМ сервере разработки обычным входом по коду приглашения, сервер при этом не менялся.
import type { Role } from '@app/shared';

export type TestAccount = {
  email: string;
  role: Role;
  // Код приглашения для регистрации (тестовые коды сервера разработки)
  inviteCode: string;
  profile: { displayName: string; faculty: string; course: number | null; about: string } | null;
  // Никнейм хранится только на устройстве (сервера для него нет)
  nick: string | null;
  // Для списка в настройках
  label: string;
  posts: string[];
  // Что этот аккаунт пишет в комментариях под постами других
  comments: string[];
};

export const TEST_ACCOUNTS: readonly TestAccount[] = [
  {
    email: '1@mail.ru',
    role: 'student',
    inviteCode: 'TEST-2026',
    profile: { displayName: 'Анна Соколова', faculty: 'Факультет компьютерных технологий и прикладной математики', course: 2, about: 'Учусь на ФКТиПМ, люблю кофе и хакатоны' },
    nick: 'anna.sokolova',
    label: 'Анна Соколова',
    posts: ['Сдала первую лабораторную по алгоритмам. Кто на хакатон в декабре?', 'В библиотеке на втором этаже наконец починили розетки'],
    comments: ['Согласна, очень удобно!', 'Я бы тоже сходила'],
  },
  {
    email: '2@mail.ru',
    role: 'student',
    inviteCode: 'TEST-2026',
    profile: { displayName: 'Максим Орлов', faculty: 'Факультет журналистики', course: 3, about: 'Пишу про университет и спорт' },
    nick: 'max.orlov',
    label: 'Максим Орлов',
    posts: ['Завтра в 18:00 в актовом зале игра КВН, приходите', 'Нашёл потерянный студенческий у главного корпуса, пишите'],
    comments: ['Отличная идея', 'Присоединяюсь'],
  },
  {
    email: '3@mail.ru',
    role: 'teacher',
    inviteCode: 'TEACHER-2026',
    // Идентификационного номера в профиле нет, поэтому заглушка лежит в «о себе»
    profile: { displayName: 'Елена Викторовна Лебедева', faculty: 'Факультет математики и компьютерных наук', course: null, about: 'Доцент кафедры. Идентификационный номер: T-0042 (заглушка)' },
    nick: 'e.lebedeva',
    label: 'Елена Викторовна Лебедева',
    posts: ['Напоминаю: консультация перед экзаменом в четверг, ауд. 133', 'Методичка по теории вероятностей обновлена, ссылка на кафедре'],
    comments: ['Хорошая инициатива, поддерживаю', 'Спасибо, что поделились'],
  },
];

export const GUEST_ACCOUNT: TestAccount = {
  email: '0@mail.ru',
  role: 'guest',
  inviteCode: 'GUEST-2026',
  // Без профиля приложение просит гостя его заполнить, поэтому у тестового гостя он есть
  profile: { displayName: 'Гость', faculty: '', course: null, about: '' },
  nick: null,
  label: 'Гость',
  posts: [],
  comments: [],
};

export const ALL_TEST_ACCOUNTS: readonly TestAccount[] = [...TEST_ACCOUNTS, GUEST_ACCOUNT];

export const findTestAccount = (email: string): TestAccount | null => {
  const normalized = email.trim().toLowerCase();
  return ALL_TEST_ACCOUNTS.find((item) => item.email === normalized) ?? null;
};
