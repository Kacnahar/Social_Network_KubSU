// Афиша: события университета. Сервера для неё пока нет: тестовые события со сдвигом от сегодняшнего дня.

export type EventFilter = 'today' | 'week' | 'all';

export const EVENT_FILTERS: readonly { value: EventFilter; label: string }[] = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'all', label: 'Все' },
];

export type UniEvent = { eventId: string; title: string; startsAt: string; place: string; description: string };

const at = (days: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const EVENTS: readonly UniEvent[] = [
  { eventId: 'e1', title: 'День открытых дверей факультета', startsAt: at(0, 17), place: 'Главный корпус, актовый зал', description: 'Знакомство с кафедрами и лабораториями.' },
  { eventId: 'e2', title: 'КВН: игра факультетов', startsAt: at(2, 18), place: 'Актовый зал, корпус А', description: 'Первая игра сезона.' },
  { eventId: 'e3', title: 'Хакатон «Студенческий сервис»', startsAt: at(4, 10), place: 'Корпус ФКТиПМ, ауд. 133', description: 'Командный марафон на сутки.' },
  { eventId: 'e4', title: 'Вечер настольных игр', startsAt: at(6, 19), place: 'Общежитие №4, холл', description: 'Приносите свои игры.' },
  { eventId: 'e5', title: 'Концерт студенческих коллективов', startsAt: at(12, 18, 30), place: 'Дворец культуры КубГУ', description: 'Вокал, танцы, оркестр.' },
];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// События, которые ещё не начались (или идут сегодня), по возрастанию времени
export function upcoming(events: readonly UniEvent[], now: Date): UniEvent[] {
  const from = startOfDay(now).getTime();
  return events.filter((event) => new Date(event.startsAt).getTime() >= from).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function filterEvents(events: readonly UniEvent[], filter: EventFilter, now: Date): UniEvent[] {
  const list = upcoming(events, now);
  if (filter === 'all') return list;
  const day = startOfDay(now).getTime();
  const end = day + (filter === 'today' ? 1 : 7) * 86_400_000;
  return list.filter((event) => new Date(event.startsAt).getTime() < end);
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const pad = (value: number) => String(value).padStart(2, '0');

// «28 ноя, 18:00»
export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// «28 ноя» — для маленьких карточек
export function formatEventDay(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
