import { ageOn, formatDate, MIN_AGE, type DateParts } from '../auth/signupForm';
import { plural } from '../../ui/plural';

// Дата рождения в профиле: проверка, возраст и подпись «14 марта 2005 · 20 лет»

export const BIRTH_OLDEST_YEAR = 1940;

// Тихая подсказка, если дата не подходит; null — всё в порядке
export function birthError(birth: DateParts, today: Date): string | null {
  const date = new Date(birth.year, birth.month - 1, birth.day);
  if (date.getTime() > today.getTime()) return 'Дата не может быть в будущем';
  if (ageOn(birth, today) < MIN_AGE) return `Возраст — не меньше ${MIN_AGE} лет`;
  return null;
}

export const ageLabel = (age: number): string => `${age} ${plural(age, 'год', 'года', 'лет')}`;

export const birthLine = (birth: DateParts, today: Date): string => `${formatDate(birth)} · ${ageLabel(ageOn(birth, today))}`;

export { formatDate };
