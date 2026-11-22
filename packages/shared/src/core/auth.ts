import { z } from 'zod';

export const LOGIN_CODE_LENGTH = 6;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const authStartRequestSchema = z.object({
  email: emailSchema,
  // Есть код — регистрация; нет кода — вход в существующий аккаунт
  inviteCode: z.string().trim().min(1).max(64).optional(),
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
  code: z.string().trim().regex(/^\d{6}$/),
});
export type AuthVerifyRequest = z.infer<typeof authVerifyRequestSchema>;

export const authVerifyResponseSchema = z.object({
  token: z.string(),
});
export type AuthVerifyResponse = z.infer<typeof authVerifyResponseSchema>;

export const okResponseSchema = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof okResponseSchema>;

export const accountResponseSchema = z.object({
  status: z.enum(['active', 'banned']),
  bannedUntil: z.iso.datetime().nullable(),
});
export type AccountResponse = z.infer<typeof accountResponseSchema>;
