import { z } from 'zod';

export const slotSchema = z.object({
  id: z.string(),
  title: z.string(),
  startsAt: z.iso.datetime(),
  durationMinutes: z.number().int().positive(),
  // upcoming — ещё не началась, live — идёт сейчас
  state: z.enum(['upcoming', 'live']),
  // Можно ли войти прямо сейчас (вход открывается чуть раньше начала)
  joinable: z.boolean(),
});
export type Slot = z.infer<typeof slotSchema>;

export const slotsResponseSchema = z.object({ slots: z.array(slotSchema) });
export type SlotsResponse = z.infer<typeof slotsResponseSchema>;

export const pushConfigResponseSchema = z.object({
  // null — напоминания на сервере не настроены
  vapidPublicKey: z.string().nullable(),
});
export type PushConfigResponse = z.infer<typeof pushConfigResponseSchema>;

export const pushSubscribeRequestSchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});
export type PushSubscribeRequest = z.infer<typeof pushSubscribeRequestSchema>;

export const pushUnsubscribeRequestSchema = z.object({
  endpoint: z.url().max(2048),
});
export type PushUnsubscribeRequest = z.infer<typeof pushUnsubscribeRequestSchema>;

// Что приходит в самом уведомлении. Личных данных здесь быть не должно.
export const pushMessageSchema = z.object({
  title: z.string(),
  body: z.string(),
  url: z.string(),
});
export type PushMessage = z.infer<typeof pushMessageSchema>;
