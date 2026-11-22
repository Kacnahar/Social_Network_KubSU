import { z } from 'zod';

// Анонимная личность для комнат: никак не связана с открытым профилем соцсети
export const roomPersonaResponseSchema = z.object({
  personaId: z.string(),
  nickname: z.string().nullable(),
  // Когда снова можно сменить ник; null — можно уже сейчас
  nicknameChangeAvailableAt: z.iso.datetime().nullable(),
});
export type RoomPersonaResponse = z.infer<typeof roomPersonaResponseSchema>;

export const setNicknameRequestSchema = z.object({
  nickname: z.string().max(64),
});
export type SetNicknameRequest = z.infer<typeof setNicknameRequestSchema>;
