import { PROFILE_NAME_MAX, authStartRequestSchema } from '@app/shared';
import type { SignupRole } from './registration';

export const MIN_AGE = 14;
export const TEACHER_ID_MAX = 32;

export type Gender = 'male' | 'female';
export type DateParts = { day: number; month: number; year: number };

export type SignupValues = {
  lastName: string;
  firstName: string;
  email: string;
  // Только студент
  gender: Gender | null;
  birthDate: DateParts | null;
  // Только преподаватель
  patronymic: string;
  noPatronymic: boolean;
  teacherId: string;
};

export type SignupField = 'lastName' | 'firstName' | 'patronymic' | 'email' | 'gender' | 'birthDate' | 'teacherId';
export type SignupErrors = Partial<Record<SignupField, string>>;

export const emptySignupValues: SignupValues = {
  lastName: '',
  firstName: '',
  email: '',
  gender: null,
  birthDate: null,
  patronymic: '',
  noPatronymic: false,
  teacherId: '',
};

// Имя: только буквы, пробел, дефис и апостроф; начинается с буквы
const NAME = /^\p{L}[\p{L}\s'’-]*$/u;
const PART_MAX = 40;

function nameError(value: string, empty: string): string | undefined {
  const text = value.trim();
  if (text === '') return empty;
  if (/\d/.test(text)) return 'Без цифр';
  if (!NAME.test(text)) return 'Только буквы';
  if (text.length > PART_MAX) return `Не длиннее ${PART_MAX} знаков`;
  return undefined;
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

// Полных лет на сегодня
export function ageOn(birth: DateParts, today: Date): number {
  const hadBirthday =
    today.getMonth() + 1 > birth.month || (today.getMonth() + 1 === birth.month && today.getDate() >= birth.day);
  return today.getFullYear() - birth.year - (hadBirthday ? 0 : 1);
}

export function validateSignup(role: SignupRole, values: SignupValues, today: Date = new Date()): SignupErrors {
  const errors: SignupErrors = {};

  const lastName = nameError(values.lastName, 'Введите фамилию');
  if (lastName) errors.lastName = lastName;
  const firstName = nameError(values.firstName, 'Введите имя');
  if (firstName) errors.firstName = firstName;
  if (!lastName && !firstName && displayNameOf(values).length > PROFILE_NAME_MAX) {
    errors.lastName = `Имя и фамилия вместе — не длиннее ${PROFILE_NAME_MAX} знаков`;
  }

  if (values.email.trim() === '') errors.email = 'Введите почту';
  else if (!authStartRequestSchema.shape.email.safeParse(values.email).success) errors.email = 'Например, name@mail.ru';

  if (role === 'student') {
    if (!values.gender) errors.gender = 'Выберите пол';
    if (!values.birthDate) errors.birthDate = 'Выберите дату рождения';
    else if (ageOn(values.birthDate, today) < MIN_AGE) errors.birthDate = `Регистрация — с ${MIN_AGE} лет`;
  } else {
    if (!values.noPatronymic) {
      const patronymic = nameError(values.patronymic, 'Введите отчество или отметьте, что его нет');
      if (patronymic) errors.patronymic = patronymic;
    }
    const id = values.teacherId.trim();
    if (id === '') errors.teacherId = 'Введите номер';
    else if (!/^[\p{L}\d-]+$/u.test(id)) errors.teacherId = 'Только буквы, цифры и дефис';
    else if (id.length > TEACHER_ID_MAX) errors.teacherId = `Не длиннее ${TEACHER_ID_MAX} знаков`;
  }

  return errors;
}

// Имя для открытого профиля: «Имя Фамилия»
export function displayNameOf(values: Pick<SignupValues, 'firstName' | 'lastName'>): string {
  return `${values.firstName.trim()} ${values.lastName.trim()}`.trim();
}

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
export const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export function formatDate(date: DateParts): string {
  return `${date.day} ${MONTHS_GENITIVE[date.month - 1]} ${date.year}`;
}
