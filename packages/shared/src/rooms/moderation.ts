import { z } from 'zod';

// Пороги и сроки из docs/MODERATION_RULES.md, часть Б
export const KICK_MIN_VOTES = 3;
export const MUTE_VOTES_NEEDED = 2;
export const VOTE_WINDOW_SECONDS = 60;
export const VOTE_COOLDOWN_MINUTES = 10;
export const MUTE_MINUTES = 10;
export const KICK_BLOCK_HOURS = 24;
export const AUTOBAN_KICKS = 3;
export const AUTOBAN_WINDOW_DAYS = 7;
export const AUTOBAN_DAYS = 7;
export const ROOM_REPORT_MAX = 1000;

export const VOTE_TYPES = ['kick', 'mute'] as const;
export type VoteType = (typeof VOTE_TYPES)[number];

// «Выгнать»: не меньше 3 голосов И не меньше трети участников (с округлением вверх).
// Участники считаются вместе с тем, против кого голосуют.
export function kickVotesNeeded(participants: number): number {
  return Math.max(KICK_MIN_VOTES, Math.ceil(participants / 3));
}

export function votesNeeded(type: VoteType, participants: number): number {
  return type === 'kick' ? kickVotesNeeded(participants) : MUTE_VOTES_NEEDED;
}

// Сам человек за себя не голосует, поэтому голосов может быть не больше «участники − 1»
export function voteIsPossible(type: VoteType, participants: number): boolean {
  return participants - 1 >= votesNeeded(type, participants);
}

export const activeVoteSchema = z.object({
  voteId: z.string(),
  type: z.enum(VOTE_TYPES),
  targetPersonaId: z.string(),
  votesFor: z.number().int(),
  votesNeeded: z.number().int(),
  endsAt: z.iso.datetime(),
  iVoted: z.boolean(),
  isAboutMe: z.boolean(),
});
export type ActiveVote = z.infer<typeof activeVoteSchema>;

export const roomStateSchema = z.object({
  roomId: z.string(),
  // Идущее голосование; кто именно голосовал, не раскрывается
  vote: activeVoteSchema.nullable(),
  // Итог последнего закончившегося голосования — чтобы показать «Решение принято» / «Не набрали голосов»
  lastResult: z
    .object({
      voteId: z.string(),
      type: z.enum(VOTE_TYPES),
      targetPersonaId: z.string(),
      passed: z.boolean(),
      resolvedAt: z.iso.datetime(),
    })
    .nullable(),
  // До какого времени у меня выключен микрофон по голосованию
  mutedUntil: z.iso.datetime().nullable(),
  // До какого времени мне закрыт вход в комнаты (выгнали или автобан); если задано — из комнаты нужно выйти
  blockedUntil: z.iso.datetime().nullable(),
  // Кого я заглушил для себя
  personalMutes: z.array(z.string()),
  // Кто сейчас поднял руку (personaId), от первого к последнему
  raisedHands: z.array(z.string()),
});
export type RoomState = z.infer<typeof roomStateSchema>;

export const startVoteRequestSchema = z.object({
  type: z.enum(VOTE_TYPES),
  targetPersonaId: z.uuid(),
});
export type StartVoteRequest = z.infer<typeof startVoteRequestSchema>;

export const roomReportRequestSchema = z.object({
  targetPersonaId: z.uuid().optional(),
  roomId: z.uuid().optional(),
  text: z.string().trim().min(1).max(ROOM_REPORT_MAX),
});
export type RoomReportRequest = z.infer<typeof roomReportRequestSchema>;
