import type { Signup } from '@app/shared';
import { toIsoDate } from '../profile/isoDate';
import type { SignupValues } from './signupForm';

// Роли, которые человек выбирает сам на первом шаге регистрации
export type SignupRole = 'student' | 'teacher';

// Шаги регистрации: кто вы → анкета → код из письма
export const SIGNUP_STEPS = 3;

export function parseSignupRole(value: unknown): SignupRole | null {
  return value === 'student' || value === 'teacher' ? value : null;
}

// Анкета в том виде, в каком её принимает сервер. Вызывать только для проверенной анкеты (validateSignup без ошибок)
export function toSignup(role: SignupRole, values: SignupValues): Signup | null {
  const lastName = values.lastName.trim();
  const firstName = values.firstName.trim();
  if (role === 'student') {
    if (!values.gender || !values.birthDate) return null;
    return { role, lastName, firstName, gender: values.gender, birthDate: toIsoDate(values.birthDate) };
  }
  return { role, lastName, firstName, patronymic: values.noPatronymic ? null : values.patronymic.trim(), staffId: values.teacherId.trim() };
}
