import { z } from 'zod';

export const ERROR_CODES = [
  'validation_error',
  'invalid_invite',
  'invalid_code',
  'too_many_requests',
  'unauthorized',
  'nickname_invalid',
  'nickname_taken',
  'nickname_change_too_soon',
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
