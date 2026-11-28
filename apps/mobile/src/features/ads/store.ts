import { useSyncExternalStore } from 'react';
import type { Ad } from './ads';
import { testAdsForFilters, testAdsForPage } from './testAds';

// Тестовые объявления и те, что человек добавил сам за этот запуск приложения.
// Заменится запросами к серверу, когда сервер научится хранить объявления.

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const author = (displayName: string) => ({ profileId: null, displayName, avatarUrl: null });
const base: Pick<Ad, 'district' | 'rentTerm' | 'photos'> = { district: null, rentTerm: null, photos: [] };

let ads: Ad[] = [
  ...testAdsForPage(),
  ...testAdsForFilters(),
  { ...base, adId: 't1', section: 'ads', kind: 'sell', title: 'Велосипед городской', description: 'Катался один сезон, есть замок и фонари. Заберёте у главного корпуса.', price: 9500, author: author('Игорь Лебедев'), createdAt: hoursAgo(1) },
  { ...base, adId: 't2', section: 'ads', kind: 'buy', title: 'Куплю недорогой ноутбук для учёбы', description: 'Нужен лёгкий, хватит для текстов и презентаций. Бюджет до 25 тысяч.', price: 25000, author: author('Марк Соколов'), createdAt: hoursAgo(2) },
  { ...base, adId: 't3', section: 'ads', kind: 'rent', title: 'Комната в двухкомнатной, 10 минут до корпуса', description: 'Комната 14 метров, есть стиральная машина и интернет. Ищу соседку, въезд с декабря.', price: 14000, district: 'Центральный', rentTerm: 'monthly', photos: [], author: author('Мария Орлова'), createdAt: hoursAgo(4) },
  { ...base, adId: 't4', section: 'ads', kind: 'rent', title: 'Студия посуточно рядом с вокзалом', description: 'Для родителей и гостей на сессию. Чисто, есть всё необходимое.', price: 2200, district: 'Западный', rentTerm: 'daily', author: author('Алина Громова'), createdAt: hoursAgo(9) },
  { ...base, adId: 't5', section: 'ads', kind: 'sell', title: 'Настольная лампа', description: 'Тёплый свет, гибкая ножка.', price: 700, author: author('Дарья Ким'), createdAt: hoursAgo(26) },
  { ...base, adId: 't6', section: 'books', kind: 'give', title: 'Учебник по матанализу, 1 курс', description: 'Демидович, почти новый, без пометок. Отдам бесплатно, заберите у корпуса.', price: null, author: author('Анна Иванова'), createdAt: hoursAgo(3) },
  { ...base, adId: 't7', section: 'books', kind: 'sell', title: 'Физика: курс лекций, 2 тома', description: 'Оба тома, лёгкие пометки карандашом.', price: 600, author: author('Сергей Ильич Петров'), createdAt: hoursAgo(11) },
  { ...base, adId: 't8', section: 'books', kind: 'swap', title: 'Меняю «Основы права» на учебник по экономике', description: 'Состояние хорошее, обмен один к одному.', price: null, author: author('Дарья Ким'), createdAt: hoursAgo(30) },
  { ...base, adId: 't9', section: 'services', kind: null, title: 'Репетитор по английскому', description: 'Помогу подготовиться к зачёту и экзамену. Занятия онлайн или в библиотеке.', price: 600, author: author('Дарья Ким'), createdAt: hoursAgo(5) },
  { ...base, adId: 't10', section: 'services', kind: null, title: 'Сделаю презентацию к защите', description: 'Аккуратные слайды по вашему тексту за один-два дня.', price: 1200, author: author('Алина Громова'), createdAt: hoursAgo(14) },
  { ...base, adId: 't11', section: 'jobs', kind: null, title: 'Бариста в кофейню у кампуса', description: 'Смены по 4–6 часов, можно совмещать с учёбой. Научим с нуля.', price: null, author: author('Кофейня «Перемена»'), createdAt: hoursAgo(8) },
  { ...base, adId: 't12', section: 'jobs', kind: null, title: 'Помощник в приёмную комиссию', description: 'Летняя подработка в вузе, июнь — август, полдня.', price: 25000, author: author('Сергей Ильич Петров'), createdAt: hoursAgo(50) },
];

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useAds(): Ad[] {
  return useSyncExternalStore(subscribe, () => ads, () => ads);
}

export function useAd(adId: string | undefined): Ad | null {
  return useAds().find((ad) => ad.adId === adId) ?? null;
}

export function addAd(ad: Omit<Ad, 'adId' | 'createdAt'>): Ad {
  const created: Ad = { ...ad, adId: `local-${Date.now()}`, createdAt: new Date().toISOString() };
  ads = [created, ...ads];
  listeners.forEach((listener) => listener());
  return created;
}

// Удалить своё объявление (страница объявления → «Удалить»)
export function removeAd(adId: string) {
  ads = ads.filter((ad) => ad.adId !== adId);
  listeners.forEach((listener) => listener());
}
