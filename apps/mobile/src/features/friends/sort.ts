import type { Person } from './testData';

export type SortMode = 'new' | 'old' | 'az' | 'za';
export const DEFAULT_SORT: SortMode = 'new';

export const SORT_OPTIONS: readonly { value: SortMode; label: string }[] = [
  { value: 'az', label: 'По имени (А–Я)' },
  { value: 'za', label: 'По имени (Я–А)' },
  { value: 'new', label: 'Сначала новые' },
  { value: 'old', label: 'Сначала старые' },
];

// Возвращает новый список, исходный не меняет
export function sortPeople(people: readonly Person[], mode: SortMode): Person[] {
  const byName = (a: Person, b: Person) => a.name.localeCompare(b.name, 'ru');
  const list = [...people];
  if (mode === 'az') return list.sort(byName);
  if (mode === 'za') return list.sort((a, b) => byName(b, a));
  if (mode === 'old') return list.sort((a, b) => a.addedAt - b.addedAt);
  return list.sort((a, b) => b.addedAt - a.addedAt);
}
