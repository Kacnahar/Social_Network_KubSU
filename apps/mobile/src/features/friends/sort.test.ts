import { describe, expect, it } from 'vitest';
import { sortPeople } from './sort';
import { TEST_FRIENDS } from './testData';

const names = (mode: Parameters<typeof sortPeople>[1]) => sortPeople(TEST_FRIENDS, mode).map((person) => person.name);

describe('сортировка друзей', () => {
  it('по имени А–Я и Я–А', () => {
    const az = names('az');
    expect(az).toEqual([...az].sort((a, b) => a.localeCompare(b, 'ru')));
    expect(names('za')).toEqual([...az].reverse());
  });
  it('новые и старые — противоположные порядки, исходный список не меняется', () => {
    const first = TEST_FRIENDS[0]?.id;
    const fresh = sortPeople(TEST_FRIENDS, 'new').map((person) => person.id);
    expect(fresh[0]).toBe(first);
    expect(sortPeople(TEST_FRIENDS, 'old').map((person) => person.id)).toEqual([...fresh].reverse());
    expect(TEST_FRIENDS[0]?.id).toBe(first);
  });
});
