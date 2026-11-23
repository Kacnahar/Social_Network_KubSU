import { describe, expect, it } from 'vitest';
import { nicknameFor, TEST_FRIENDS, TEST_REQUESTS, translit } from './testData';

describe('тестовые друзья', () => {
  it('128 человек, никнеймы уникальны и по правилам', () => {
    expect(TEST_FRIENDS).toHaveLength(128);
    expect(new Set(TEST_FRIENDS.map((person) => person.nickname)).size).toBe(128);
    expect(TEST_FRIENDS.every((person) => /^[a-z.]{3,20}$/.test(person.nickname))).toBe(true);
    expect(TEST_REQUESTS).toHaveLength(3);
  });
  it('переводит имена в латиницу', () => {
    expect(translit('Щербаков')).toBe('scherbakov');
    expect(nicknameFor('Анна', 'Иванова')).toBe('anna.ivanova');
  });
});
