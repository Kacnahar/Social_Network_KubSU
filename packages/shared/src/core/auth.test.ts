import { describe, expect, it } from 'vitest';
import { ageOn, authStartRequestSchema, authVerifyRequestSchema, signupSchema } from './auth';

describe('authStartRequestSchema', () => {
  it('приводит почту к нижнему регистру и обрезает пробелы', () => {
    const parsed = authStartRequestSchema.parse({ email: '  Student@Example.COM ' });
    expect(parsed.email).toBe('student@example.com');
  });

  it('отклоняет не почту', () => {
    expect(authStartRequestSchema.safeParse({ email: 'не почта' }).success).toBe(false);
  });
});

describe('анкета регистрации', () => {
  const student = { role: 'student', lastName: ' Петров ', firstName: 'Иван', gender: 'male', birthDate: '2005-03-14' };
  const teacher = { role: 'teacher', lastName: "О'Нил", firstName: 'Анна-Мария', patronymic: null, staffId: 'T-0042' };

  it('принимает студента и преподавателя, обрезает пробелы', () => {
    expect(signupSchema.parse(student)).toMatchObject({ lastName: 'Петров' });
    expect(signupSchema.safeParse(teacher).success).toBe(true);
  });

  it('роль гостя и админа выбрать нельзя; чужие поля не подходят', () => {
    expect(signupSchema.safeParse({ ...student, role: 'guest' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...student, role: 'admin' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...student, birthDate: '14.03.2005' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...teacher, staffId: 'a b' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...teacher, firstName: 'Анна1' }).success).toBe(false);
  });

  it('считает полные годы', () => {
    expect(ageOn('2005-03-14', new Date(2026, 2, 13))).toBe(20);
    expect(ageOn('2005-03-14', new Date(2026, 2, 14))).toBe(21);
  });

  it('код входа — 6 цифр или тестовые 4', () => {
    const code = (value: string) => authVerifyRequestSchema.safeParse({ email: 'a@b.ru', code: value }).success;
    expect(code('123456')).toBe(true);
    expect(code('0000')).toBe(true);
    expect(code('12345')).toBe(false);
    expect(code('abcdef')).toBe(false);
  });
});
