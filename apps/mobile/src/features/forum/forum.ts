import { useSyncExternalStore } from 'react';

// Форум: темы студентов. Сервера для него пока нет: всё на тестовых данных и живёт в памяти приложения.

export type ForumCategory = 'study' | 'dorm' | 'other';

export const FORUM_CATEGORIES: readonly { value: ForumCategory; label: string }[] = [
  { value: 'study', label: 'Учёба' },
  { value: 'dorm', label: 'Общежитие' },
  { value: 'other', label: 'Разное' },
];

export const TOPIC_TITLE_MAX = 100;
export const TOPIC_TEXT_MAX = 1000;

export type Topic = {
  topicId: string;
  category: ForumCategory;
  title: string;
  text: string;
  author: string;
  replies: number;
  createdAt: string;
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

let topics: Topic[] = [
  { topicId: 'f1', category: 'study', title: 'Где сдавать лабораторные по ЭВМ?', text: 'Подскажите, в какой аудитории и до какого числа принимают.', author: 'Марк Соколов', replies: 8, createdAt: hoursAgo(0.2) },
  { topicId: 'f2', category: 'dorm', title: 'Кто в общежитии №4 — когда отключат воду?', text: 'Сегодня объявили, но без времени.', author: 'Дарья Ким', replies: 14, createdAt: hoursAgo(1.5) },
  { topicId: 'f3', category: 'study', title: 'Как готовиться к экзамену по матанализу', text: 'Делитесь конспектами и советами.', author: 'Анна Иванова', replies: 23, createdAt: hoursAgo(5) },
  { topicId: 'f4', category: 'other', title: 'Ищу компанию на хакатон в декабре', text: 'Нужны дизайнер и бэкендер.', author: 'Алина Громова', replies: 6, createdAt: hoursAgo(9) },
  { topicId: 'f5', category: 'other', title: 'Где поесть недорого рядом с главным корпусом?', text: 'Хочется чего-то кроме столовой.', author: 'Игорь Лебедев', replies: 31, createdAt: hoursAgo(27) },
  { topicId: 'f6', category: 'dorm', title: 'Правила заселения в новом семестре', text: 'Кто уже узнавал, что нужно с собой?', author: 'Сергей Ильич Петров', replies: 4, createdAt: hoursAgo(52) },
];

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useTopics = (): Topic[] => useSyncExternalStore(subscribe, () => topics, () => topics);

export function addTopic(topic: Pick<Topic, 'category' | 'title' | 'text' | 'author'>): Topic {
  const created: Topic = { ...topic, topicId: `local-${Date.now()}`, replies: 0, createdAt: new Date().toISOString() };
  topics = [created, ...topics];
  listeners.forEach((listener) => listener());
  return created;
}

// Список тем: категория (null — все) и поиск по заголовку и тексту
export function filterTopics(list: readonly Topic[], category: ForumCategory | null, query: string): Topic[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((topic) => {
    if (category && topic.category !== category) return false;
    const text = `${topic.title} ${topic.text}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

// «1 ответ», «2 ответа», «5 ответов»
export function repliesLabel(count: number): string {
  const rest = count % 100;
  if (rest >= 11 && rest <= 14) return `${count} ответов`;
  const last = count % 10;
  if (last === 1) return `${count} ответ`;
  if (last >= 2 && last <= 4) return `${count} ответа`;
  return `${count} ответов`;
}
