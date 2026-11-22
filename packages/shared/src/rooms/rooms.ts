import { z } from 'zod';

export const ROOM_CAPACITY = 25;
// За сколько минут до начала уже можно войти (уведомление «через 5 минут» ведёт сразу в комнату)
export const ROOM_JOIN_EARLY_MINUTES = 5;

export const joinRoomResponseSchema = z.object({
  roomId: z.string(),
  // Адрес сервера звука и временный пропуск на него
  voiceUrl: z.string(),
  voiceToken: z.string(),
  // Когда комната закроется
  endsAt: z.iso.datetime(),
});
export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;
