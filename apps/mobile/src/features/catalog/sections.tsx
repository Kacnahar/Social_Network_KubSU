import type { ReactNode } from 'react';
import { AdsIcon, BookIcon, CalendarIcon, JobIcon, ServiceIcon } from '../../ui/icons';

// Разделы каталога в том порядке, в каком они показаны плитками
export type CatalogTile = {
  key: 'schedule' | 'ads' | 'books' | 'services' | 'jobs';
  label: string;
  caption: string;
  icon: (color: string) => ReactNode;
};

export const CATALOG_TILES: readonly CatalogTile[] = [
  { key: 'schedule', label: 'Расписание', caption: 'Расписание пар', icon: (color) => <CalendarIcon color={color} /> },
  { key: 'ads', label: 'Объявления', caption: 'Купить, продать, аренда жилья', icon: (color) => <AdsIcon color={color} /> },
  { key: 'books', label: 'Книги', caption: 'Учебники: продать, отдать, обменять', icon: (color) => <BookIcon color={color} /> },
  { key: 'services', label: 'Услуги', caption: 'Репетиторство, помощь с учёбой', icon: (color) => <ServiceIcon color={color} /> },
  { key: 'jobs', label: 'Вакансии', caption: 'Подработка и стажировки', icon: (color) => <JobIcon color={color} /> },
];
