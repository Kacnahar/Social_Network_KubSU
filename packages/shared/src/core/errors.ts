import { z } from 'zod';

export const ERROR_CODES = [
  'validation_error',
  'invalid_invite',
  'invalid_code',
  'too_many_requests',
  'unauthorized',
  'forbidden',
  'media_invalid',
  'media_too_large',
  'nickname_invalid',
  'nickname_taken',
  'nickname_change_too_soon',
  'push_unavailable',
  'room_not_open',
  'voice_unavailable',
  'nickname_required',
  'account_banned',
  'not_found',
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
