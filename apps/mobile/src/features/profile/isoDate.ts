import type { DateParts } from '../auth/signupForm';

// Дата без времени, как её принимает сервер: «2005-03-14»
export function toIsoDate(date: DateParts): string {
  const two = (value: number) => String(value).padStart(2, '0');
  return `${String(date.year).padStart(4, '0')}-${two(date.month)}-${two(date.day)}`;
}

export function fromIsoDate(text: string | null | undefined): DateParts | null {
  const match = text ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(text) : null;
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}
