import { describe, expect, it } from 'vitest';
import { detectService, normalizeLink } from './links';
import { filterFaculties, FACULTIES, shortFaculty } from './faculties';

describe('ссылки', () => {
  it('добавляет https и отвергает мусор', () => {
    expect(normalizeLink('github.com/ivan')).toBe('https://github.com/ivan');
    expect(normalizeLink('привет')).toBeNull();
    expect(normalizeLink('два слова.ru')).toBeNull();
    expect(normalizeLink('ftp://x.ru')).toBeNull();
    expect(normalizeLink('')).toBeNull();
  });
  it('узнаёт сервис по адресу', () => {
    expect(detectService('t.me/ivan')).toBe('telegram');
    expect(detectService('https://www.github.com/ivan')).toBe('github');
    expect(detectService('ivan.dev')).toBe('site');
    expect(detectService('https://www.youtube.com/@x')).toBe('youtube');
    expect(detectService('m.vk.com/id1')).toBe('vk');
    expect(detectService('twitter.com/x')).toBe('x');
    expect(detectService('max.ru/u/1')).toBe('max');
    expect(detectService('https://notgithub.com/x')).toBe('site');
    expect(detectService('не адрес')).toBe('site');
  });
});

describe('факультеты', () => {
  it('17 пунктов, поиск без учёта регистра', () => {
    expect(FACULTIES).toHaveLength(17);
    expect(filterFaculties('ЮРИД').map((item) => item.name)).toEqual(['Юридический факультет']);
    expect(filterFaculties('фктипм')).toHaveLength(1);
    expect(shortFaculty('Факультет математики и компьютерных наук')).toBe('ФМиКН');
    expect(shortFaculty('Юридический факультет')).toBe('Юридический факультет');
    expect(shortFaculty('Что-то старое')).toBe('Что-то старое');
    expect(filterFaculties('')).toHaveLength(17);
    expect(filterFaculties('zzz')).toEqual([]);
  });
});
