import { describe, expect, it } from 'vitest';
import { filterTopics, repliesLabel, type Topic } from './forum';

const topic = (patch: Partial<Topic>): Topic => ({ topicId: 'a', category: 'study', title: 'Тема', text: 'Текст', author: 'Анна', replies: 0, createdAt: '2026-11-22T10:00:00.000Z', ...patch });

describe('форум', () => {
  it('фильтрует по категории и ищет по заголовку и тексту', () => {
    const list = [topic({ topicId: '1', title: 'Экзамен' }), topic({ topicId: '2', category: 'dorm', text: 'Вода' })];
    expect(filterTopics(list, 'dorm', '').map((item) => item.topicId)).toEqual(['2']);
    expect(filterTopics(list, null, 'ЭКЗАМЕН').map((item) => item.topicId)).toEqual(['1']);
    expect(filterTopics(list, null, 'вода').map((item) => item.topicId)).toEqual(['2']);
  });

  it('склоняет «ответ»', () => {
    expect([0, 1, 2, 5, 11, 12, 21, 24, 111].map(repliesLabel)).toEqual(['0 ответов', '1 ответ', '2 ответа', '5 ответов', '11 ответов', '12 ответов', '21 ответ', '24 ответа', '111 ответов']);
  });
});
