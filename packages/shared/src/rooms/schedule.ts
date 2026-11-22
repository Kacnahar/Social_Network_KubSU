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
