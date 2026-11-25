import { describe, expect, it } from 'vitest';
import { ageOn, daysInMonth, displayNameOf, emptySignupValues, formatDate, validateSignup, type SignupValues } from './signupForm';

const today = new Date(2026, 10, 22); // 22 ноября 2026

const student: SignupValues = {
  ...emptySignupValues,
  lastName: 'Иванова',
  firstName: 'Анна',
  email: 'anna@example.com',
  gender: 'female',
  birthDate: { day: 5, month: 3, year: 2006 },
};

const teacher: SignupValues = {
  ...emptySignupValues,
  lastName: 'Петров',
  firstName: 'Сергей',
  patronymic: 'Ильич',
  email: 'petrov@example.com',
  teacherId: 'T-10452',
};

describe('validateSignup — студент', () => {
  it('принимает правильно заполненную анкету', () => {
    expect(validateSignup('student', student, today)).toEqual({});
  });

  it('требует все поля', () => {
    expect(Object.keys(validateSignup('student', emptySignupValues, today)).sort()).toEqual(
      ['birthDate', 'email', 'firstName', 'gender', 'lastName'].sort(),
    );
  });

  it('не пропускает цифры в имени', () => {
    expect(validateSignup('student', { ...student, firstName: 'Анна2' }, today).firstName).toBe('Без цифр');
  });

  it('пропускает двойную фамилию через дефис', () => {
    expect(validateSignup('student', { ...student, lastName: 'Римский-Корсаков' }, today)).toEqual({});
  });

  it('проверяет формат почты', () => {
    expect(validateSignup('student', { ...student, email: 'anna@' }, today).email).toBeDefined();
  });

  it('не регистрирует младше 14 лет', () => {
    const tooYoung = { ...student, birthDate: { day: 23, month: 11, year: 2012 } };
    expect(validateSignup('student', tooYoung, today).birthDate).toBe('Регистрация — с 14 лет');
    const justFourteen = { ...student, birthDate: { day: 22, month: 11, year: 2012 } };
    expect(validateSignup('student', justFourteen, today).birthDate).toBeUndefined();
  });

  it('не спрашивает поля преподавателя', () => {
    const errors = validateSignup('student', student, today);
    expect(errors.patronymic).toBeUndefined();
    expect(errors.teacherId).toBeUndefined();
  });
});

describe('validateSignup — преподаватель', () => {
  it('принимает правильно заполненную анкету', () => {
    expect(validateSignup('teacher', teacher, today)).toEqual({});
  });

  it('требует отчество, пока не отмечено «Нет отчества»', () => {
    expect(validateSignup('teacher', { ...teacher, patronymic: '' }, today).patronymic).toBeDefined();
    expect(validateSignup('teacher', { ...teacher, patronymic: '', noPatronymic: true }, today)).toEqual({});
  });

  it('требует идентификационный номер', () => {
    expect(validateSignup('teacher', { ...teacher, teacherId: ' ' }, today).teacherId).toBe('Введите номер');
  });

  it('не спрашивает пол и дату рождения', () => {
    const errors = validateSignup('teacher', teacher, today);
    expect(errors.gender).toBeUndefined();
    expect(errors.birthDate).toBeUndefined();
  });
});

describe('даты и имя', () => {
  it('считает полные годы', () => {
    expect(ageOn({ day: 22, month: 11, year: 2006 }, today)).toBe(20);
    expect(ageOn({ day: 23, month: 11, year: 2006 }, today)).toBe(19);
  });

  it('знает число дней в месяце', () => {
    expect(daysInMonth(2, 2024)).toBe(29);
    expect(daysInMonth(2, 2025)).toBe(28);
    expect(daysInMonth(4, 2025)).toBe(30);
  });

  it('пишет дату по-русски', () => {
    expect(formatDate({ day: 5, month: 3, year: 2006 })).toBe('5 марта 2006');
  });

  it('собирает имя для профиля', () => {
    expect(displayNameOf({ firstName: ' Анна ', lastName: 'Иванова' })).toBe('Анна Иванова');
  });
});
