import { z } from 'zod';

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
