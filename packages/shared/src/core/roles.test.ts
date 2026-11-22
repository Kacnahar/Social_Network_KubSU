import { describe, expect, it } from 'vitest';
import { updateProfileRequestSchema } from './profile';
import { can } from './roles';

describe('права ролей', () => {
  it('студент может всё', () => {
    expect([can('student', 'rooms'), can('student', 'publish'), can('student', 'react')]).toEqual([true, true, true]);
  });

  it('преподаватель — всё, кроме комнат', () => {
    expect([can('teacher', 'rooms'), can('teacher', 'publish'), can('teacher', 'react')]).toEqual([false, true, true]);
  });

  it('гость только смотрит', () => {
    expect([can('guest', 'rooms'), can('guest', 'publish'), can('guest', 'react')]).toEqual([false, false, false]);
  });
});

describe('данные профиля', () => {
  it('обрезает пробелы, пустые необязательные поля превращает в «нет»', () => {
    const parsed = updateProfileRequestSchema.parse({ displayName: '  Аня  ', faculty: '   ', about: '' });
    expect(parsed).toEqual({ displayName: 'Аня', faculty: null, about: null });
  });

  it('требует имя и отклоняет слишком длинное', () => {
    expect(updateProfileRequestSchema.safeParse({ displayName: '   ' }).success).toBe(false);
    expect(updateProfileRequestSchema.safeParse({ displayName: 'а'.repeat(61) }).success).toBe(false);
  });

  it('курс — от 1 до 6', () => {
    expect(updateProfileRequestSchema.safeParse({ displayName: 'Аня', course: 0 }).success).toBe(false);
    expect(updateProfileRequestSchema.safeParse({ displayName: 'Аня', course: 7 }).success).toBe(false);
    expect(updateProfileRequestSchema.safeParse({ displayName: 'Аня', course: 3 }).success).toBe(true);
  });
});
