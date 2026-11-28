import { z } from 'zod';
import { roleSchema } from './roles';

export const LOGIN_CODE_LENGTH = 6;

// Только для разработки: тестовые аккаунты входят по этому коду. В продакшене сервер его не принимает
export const TEST_LOGIN_CODE = '0000';
export const TEST_LOGIN_EMAILS = ['1@mail.ru', '2@mail.ru', '3@mail.ru'] as const;
export const isTestLoginEmail = (email: string): boolean => (TEST_LOGIN_EMAILS as readonly string[]).includes(email);

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

// ---------- Анкета регистрации: своя для студента и для преподавателя ----------

export const SIGNUP_MIN_AGE = 14;
export const SIGNUP_NAME_PART_MAX = 40;
export const STAFF_ID_MAX = 32;

export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];

// Имя, фамилия, отчество: только буквы, пробел, дефис и апостроф; начинается с буквы
const namePartSchema = z
  .string()
  .trim()
  .min(1)
  .max(SIGNUP_NAME_PART_MAX)
  .regex(/^\p{L}[\p{L}\s'’-]*$/u);

// Дата без времени: «2005-03-14»
export const dateOnlySchema = z.iso.date();

// Полных лет на указанный день
export function ageOn(birthDate: string, today: Date): number {
  const [year = 0, month = 1, day = 1] = birthDate.split('-').map(Number);
  const hadBirthday = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  return today.getFullYear() - year - (hadBirthday ? 0 : 1);
}

export const signupStudentSchema = z.object({
  role: z.literal('student'),
  lastName: namePartSchema,
  firstName: namePartSchema,
  gender: z.enum(GENDERS),
  birthDate: dateOnlySchema,
});

export const signupTeacherSchema = z.object({
  role: z.literal('teacher'),
  lastName: namePartSchema,
  firstName: namePartSchema,
  // null — отчества нет
  patronymic: namePartSchema.nullable(),
  // Номер преподавателя, выданный вузом. Виден только админам
  staffId: z
    .string()
    .trim()
    .min(1)
    .max(STAFF_ID_MAX)
    .regex(/^[\p{L}\d-]+$/u),
});

export const signupSchema = z.discriminatedUnion('role', [signupStudentSchema, signupTeacherSchema]);
export type Signup = z.infer<typeof signupSchema>;

export const authStartRequestSchema = z.object({
  email: emailSchema,
  // Регистрация по коду приглашения (роль задаёт код). Без кода и без анкеты — вход в существующий аккаунт
  inviteCode: z.string().trim().min(1).max(64).optional(),
  // Регистрация с анкетой: роль человек выбирает сам. Если почта уже зарегистрирована, анкета не используется — это просто вход
  signup: signupSchema.optional(),
});
export type AuthStartRequest = z.infer<typeof authStartRequestSchema>;

export const authStartResponseSchema = z.object({
  ok: z.literal(true),
  // Только в режиме разработки, пока не подключена отправка писем
  devCode: z.string().optional(),
});
export type AuthStartResponse = z.infer<typeof authStartResponseSchema>;

export const authVerifyRequestSchema = z.object({
  email: emailSchema,
  // 6 цифр из письма; 4 цифры — только тестовый код при разработке
  code: z.string().trim().regex(/^(\d{4}|\d{6})$/),
});
export type AuthVerifyRequest = z.infer<typeof authVerifyRequestSchema>;

export const authVerifyResponseSchema = z.object({
  token: z.string(),
});
export type AuthVerifyResponse = z.infer<typeof authVerifyResponseSchema>;

export const okResponseSchema = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof okResponseSchema>;

export const accountResponseSchema = z.object({
  role: roleSchema,
  status: z.enum(['active', 'banned']),
  bannedUntil: z.iso.datetime().nullable(),
  // Показывать ли раздел «Админка»; права всё равно проверяет сервер
  isAdmin: z.boolean(),
});
export type AccountResponse = z.infer<typeof accountResponseSchema>;
