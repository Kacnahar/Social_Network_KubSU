import type { DateParts } from '../auth/signupForm';

// Дополнительные настройки профиля, которых нет на сервере: что показывать, кафедра, ссылки.
// Пока хранятся только на устройстве.

export type ProfileExtras = {
  showFaculty: boolean;
  showBirth: boolean;
  showFriends: boolean;
  showOnline: boolean;
  chair: string;
  links: string[];
  // Дата рождения; показывается в профиле, только если включено showBirth
  birth: DateParts | null;
};

export const DEFAULT_EXTRAS: ProfileExtras = { showFaculty: true, showBirth: false, showFriends: true, showOnline: true, chair: '', links: [], birth: null };

export function parseExtras(raw: unknown): ProfileExtras {
  const d = DEFAULT_EXTRAS;
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
  return {
    showFaculty: bool(r.showFaculty, d.showFaculty),
    showBirth: bool(r.showBirth, d.showBirth),
    showFriends: bool(r.showFriends, d.showFriends),
    showOnline: bool(r.showOnline, d.showOnline),
    chair: typeof r.chair === 'string' ? r.chair.slice(0, 100) : '',
    birth: parseBirth(r.birth),
    links: Array.isArray(r.links) ? r.links.filter((item): item is string => typeof item === 'string').slice(0, 3) : [],
  };
}

function parseBirth(raw: unknown): DateParts | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const { day, month, year } = r;
  if (typeof day !== 'number' || typeof month !== 'number' || typeof year !== 'number') return null;
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
  return { day, month, year };
}
