import {
  AUTOBAN_DAYS,
  AUTOBAN_KICKS,
  AUTOBAN_WINDOW_DAYS,
  KICK_BLOCK_HOURS,
  MUTE_MINUTES,
  VOTE_COOLDOWN_MINUTES,
  VOTE_WINDOW_SECONDS,
  voteIsPossible,
  votesNeeded,
  type RoomReportRequest,
  type RoomState,
  type StartVoteRequest,
} from '@app/shared';
import { and, desc, eq, gt, inArray, isNull, lte, sql } from 'drizzle-orm';
import { ApiError } from '../../../core/errors';
import type { Db } from '../../../db/client';
import {
  roomParticipations,
  roomPersonalMutes,
  roomReports,
  roomSanctions,
  roomVoteBallots,
  roomVotes,
  rooms,
} from '../../../db/schema';
import type { VoiceGateway } from '../voice/gateway';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
// Сколько секунд после окончания голосования показывать его итог
const RESULT_VISIBLE_MS = 15 * 1000;

export type ModerationDeps = {
  db: Db;
  voice: VoiceGateway | null;
  onError: (error: unknown) => void;
};

type Room = typeof rooms.$inferSelect;
type Vote = typeof roomVotes.$inferSelect;

const roomNotFound = () => new ApiError(404, 'not_found', 'Такой комнаты нет');
const voiceUnavailable = () => new ApiError(503, 'voice_unavailable', 'Комнаты временно недоступны. Попробуйте через минуту');
const notPossible = (message: string) => new ApiError(409, 'vote_not_possible', message);

async function loadOpenRoom(db: Db, roomId: string): Promise<Room> {
  const [room] = await db.select().from(rooms).where(and(eq(rooms.id, roomId), isNull(rooms.closedAt)));
  if (!room) throw roomNotFound();
  return room;
}

// ---------- Блокировки и заглушки ----------

// До какого времени человеку закрыт вход во все комнаты (выгнали или автобан)
export async function blockedUntil(db: Db, personaId: string, now: Date): Promise<Date | null> {
  const [row] = await db
    .select({ endsAt: roomSanctions.endsAt })
    .from(roomSanctions)
    .where(
      and(
        eq(roomSanctions.personaId, personaId),
        inArray(roomSanctions.type, ['room_block', 'rooms_ban']),
        gt(roomSanctions.endsAt, now),
      ),
    )
    .orderBy(desc(roomSanctions.endsAt))
    .limit(1);
  return row?.endsAt ?? null;
}

// До какого времени у человека выключен микрофон в этой комнате
export async function mutedUntil(db: Db, personaId: string, roomId: string, now: Date): Promise<Date | null> {
  const [row] = await db
    .select({ endsAt: roomSanctions.endsAt })
    .from(roomSanctions)
    .where(
      and(
        eq(roomSanctions.personaId, personaId),
        eq(roomSanctions.type, 'mute'),
        eq(roomSanctions.roomId, roomId),
        gt(roomSanctions.endsAt, now),
      ),
    )
    .orderBy(desc(roomSanctions.endsAt))
    .limit(1);
  return row?.endsAt ?? null;
}

// Фоновая задача: вернуть микрофон тем, у кого срок заглушки вышел
export async function liftExpiredMutes(deps: ModerationDeps, now: Date): Promise<void> {
  const expired = await deps.db
    .select({ id: roomSanctions.id, personaId: roomSanctions.personaId, voiceRoomName: rooms.voiceRoomName, closedAt: rooms.closedAt })
    .from(roomSanctions)
    .innerJoin(rooms, eq(rooms.id, roomSanctions.roomId))
    .where(and(eq(roomSanctions.type, 'mute'), isNull(roomSanctions.liftedAt), lte(roomSanctions.endsAt, now)));
  for (const mute of expired) {
    try {
      if (mute.closedAt === null) await deps.voice?.setCanPublish(mute.voiceRoomName, mute.personaId, true);
      await deps.db.update(roomSanctions).set({ liftedAt: now }).where(eq(roomSanctions.id, mute.id));
    } catch (error) {
      // Сервер звука недоступен — попробуем на следующем проходе
      deps.onError(error);
    }
  }
}

// ---------- Голосования ----------

async function expireDueVotes(db: Db, roomId: string, now: Date): Promise<void> {
  await db
    .update(roomVotes)
    .set({ result: 'failed', resolvedAt: now })
    .where(and(eq(roomVotes.roomId, roomId), eq(roomVotes.result, 'pending'), lte(roomVotes.endsAt, now)));
}

async function countBallots(db: Db, voteId: string): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(roomVoteBallots).where(eq(roomVoteBallots.voteId, voteId));
  return row?.count ?? 0;
}

async function applyPassedVote(deps: ModerationDeps, vote: Vote, room: Room, now: Date): Promise<void> {
  const { db, voice } = deps;
  await db.update(roomVotes).set({ result: 'passed', resolvedAt: now }).where(eq(roomVotes.id, vote.id));

  if (vote.type === 'mute') {
    await db.insert(roomSanctions).values({
      personaId: vote.targetPersonaId,
      type: 'mute',
      roomId: room.id,
      source: 'vote',
      startsAt: now,
      endsAt: new Date(now.getTime() + MUTE_MINUTES * MINUTE),
    });
    await voice?.setCanPublish(room.voiceRoomName, vote.targetPersonaId, false).catch(deps.onError);
    return;
  }

  // Выгнали: вход во все комнаты закрыт на сутки
  await db.insert(roomSanctions).values({
    personaId: vote.targetPersonaId,
    type: 'room_block',
    roomId: room.id,
    source: 'vote',
    startsAt: now,
    endsAt: new Date(now.getTime() + KICK_BLOCK_HOURS * HOUR),
  });
  await db
    .update(roomParticipations)
    .set({ leftAt: now })
    .where(
      and(eq(roomParticipations.roomId, room.id), eq(roomParticipations.personaId, vote.targetPersonaId), isNull(roomParticipations.leftAt)),
    );
  await voice?.removeParticipant(room.voiceRoomName, vote.targetPersonaId).catch(deps.onError);

  // Автобан: выгнали из нескольких разных комнат за неделю
  const recent = await db
    .select({ roomId: roomSanctions.roomId })
    .from(roomSanctions)
    .where(
      and(
        eq(roomSanctions.personaId, vote.targetPersonaId),
        eq(roomSanctions.type, 'room_block'),
        eq(roomSanctions.source, 'vote'),
        gt(roomSanctions.startsAt, new Date(now.getTime() - AUTOBAN_WINDOW_DAYS * DAY)),
      ),
    );
  if (new Set(recent.map((row) => row.roomId)).size >= AUTOBAN_KICKS) {
    await db.insert(roomSanctions).values({
      personaId: vote.targetPersonaId,
      type: 'rooms_ban',
      roomId: null,
      source: 'auto',
      startsAt: now,
      endsAt: new Date(now.getTime() + AUTOBAN_DAYS * DAY),
    });
  }
}

export async function startVote(
  deps: ModerationDeps,
  personaId: string,
  roomId: string,
  input: StartVoteRequest,
  now: Date,
): Promise<void> {
  const { db, voice } = deps;
  const room = await loadOpenRoom(db, roomId);
  if (!voice) throw voiceUnavailable();
  if (input.targetPersonaId === personaId) throw notPossible('Голосовать против себя нельзя');

  let present: string[];
  try {
    present = await voice.listIdentities(room.voiceRoomName);
  } catch (error) {
    deps.onError(error);
    throw voiceUnavailable();
  }
  if (!present.includes(personaId)) throw new ApiError(403, 'forbidden', 'Голосовать могут только те, кто сейчас в комнате');
  if (!present.includes(input.targetPersonaId)) throw notPossible('Этого человека уже нет в комнате');
  if (!voteIsPossible(input.type, present.length)) throw notPossible('В комнате слишком мало людей для такого голосования');

  await expireDueVotes(db, roomId, now);
  const [pending] = await db.select({ id: roomVotes.id }).from(roomVotes).where(and(eq(roomVotes.roomId, roomId), eq(roomVotes.result, 'pending')));
  if (pending) throw new ApiError(409, 'vote_in_progress', 'В комнате уже идёт голосование');

  // Против одного человека — не чаще раза в 10 минут
  const [recent] = await db
    .select({ id: roomVotes.id })
    .from(roomVotes)
    .where(
      and(
        eq(roomVotes.roomId, roomId),
        eq(roomVotes.targetPersonaId, input.targetPersonaId),
        gt(roomVotes.startedAt, new Date(now.getTime() - VOTE_COOLDOWN_MINUTES * MINUTE)),
      ),
    );
  if (recent) throw new ApiError(409, 'vote_cooldown', `Голосовать против одного человека можно раз в ${VOTE_COOLDOWN_MINUTES} минут`);

  await db.transaction(async (tx) => {
    const [vote] = await tx
      .insert(roomVotes)
      .values({
        roomId,
        type: input.type,
        targetPersonaId: input.targetPersonaId,
        initiatorPersonaId: personaId,
        participantsAtStart: present.length,
        votesNeeded: votesNeeded(input.type, present.length),
        startedAt: now,
        endsAt: new Date(now.getTime() + VOTE_WINDOW_SECONDS * 1000),
      })
      .returning({ id: roomVotes.id });
    // Тот, кто начал, сразу голосует «за»
    await tx.insert(roomVoteBallots).values({ voteId: vote!.id, voterPersonaId: personaId, createdAt: now });
  });
}

export async function castBallot(deps: ModerationDeps, personaId: string, voteId: string, now: Date): Promise<void> {
  const { db, voice } = deps;
  const [vote] = await db.select().from(roomVotes).where(eq(roomVotes.id, voteId));
  if (!vote) throw new ApiError(404, 'not_found', 'Такого голосования нет');
  const room = await loadOpenRoom(db, vote.roomId);
  if (!voice) throw voiceUnavailable();
  if (vote.result !== 'pending' || vote.endsAt <= now) throw notPossible('Голосование уже закончилось');
  if (vote.targetPersonaId === personaId) throw notPossible('В голосовании против себя участвовать нельзя');

  let present: string[];
  try {
    present = await voice.listIdentities(room.voiceRoomName);
  } catch (error) {
    deps.onError(error);
    throw voiceUnavailable();
  }
  if (!present.includes(personaId)) throw new ApiError(403, 'forbidden', 'Голосовать могут только те, кто сейчас в комнате');

  await db.insert(roomVoteBallots).values({ voteId, voterPersonaId: personaId, createdAt: now }).onConflictDoNothing();
  if ((await countBallots(db, voteId)) >= vote.votesNeeded) await applyPassedVote(deps, vote, room, now);
}

// ---------- Состояние комнаты для экрана ----------

export async function getRoomState(deps: ModerationDeps, personaId: string, roomId: string, now: Date): Promise<RoomState> {
  const { db } = deps;
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) throw roomNotFound();
  await expireDueVotes(db, roomId, now);

  const [pending] = await db.select().from(roomVotes).where(and(eq(roomVotes.roomId, roomId), eq(roomVotes.result, 'pending')));
  const [last] = await db
    .select()
    .from(roomVotes)
    .where(and(eq(roomVotes.roomId, roomId), gt(roomVotes.resolvedAt, new Date(now.getTime() - RESULT_VISIBLE_MS))))
    .orderBy(desc(roomVotes.resolvedAt))
    .limit(1);

  let vote: RoomState['vote'] = null;
  if (pending) {
    const [mine] = await db
      .select({ voteId: roomVoteBallots.voteId })
      .from(roomVoteBallots)
      .where(and(eq(roomVoteBallots.voteId, pending.id), eq(roomVoteBallots.voterPersonaId, personaId)));
    vote = {
      voteId: pending.id,
      type: pending.type,
      targetPersonaId: pending.targetPersonaId,
      votesFor: await countBallots(db, pending.id),
      votesNeeded: pending.votesNeeded,
      endsAt: pending.endsAt.toISOString(),
      iVoted: Boolean(mine),
      isAboutMe: pending.targetPersonaId === personaId,
    };
  }

  const [muted, blocked, personal] = await Promise.all([
    mutedUntil(db, personaId, roomId, now),
    blockedUntil(db, personaId, now),
    db.select({ id: roomPersonalMutes.mutedPersonaId }).from(roomPersonalMutes).where(eq(roomPersonalMutes.personaId, personaId)),
  ]);

  return {
    roomId,
    vote,
    lastResult:
      last && last.resolvedAt
        ? {
            voteId: last.id,
            type: last.type,
            targetPersonaId: last.targetPersonaId,
            passed: last.result === 'passed',
            resolvedAt: last.resolvedAt.toISOString(),
          }
        : null,
    mutedUntil: muted?.toISOString() ?? null,
    blockedUntil: blocked?.toISOString() ?? null,
    personalMutes: personal.map((row) => row.id),
  };
}

// ---------- «Заглушить для себя» и жалобы ----------

export async function setPersonalMute(db: Db, personaId: string, mutedPersonaId: string, muted: boolean): Promise<void> {
  if (personaId === mutedPersonaId) throw new ApiError(400, 'validation_error', 'Себя заглушить нельзя');
  if (muted) {
    try {
      await db.insert(roomPersonalMutes).values({ personaId, mutedPersonaId, createdAt: new Date() }).onConflictDoNothing();
    } catch {
      // Такой персоны нет — заглушать некого
      throw new ApiError(404, 'not_found', 'Такого участника нет');
    }
  } else {
    await db
      .delete(roomPersonalMutes)
      .where(and(eq(roomPersonalMutes.personaId, personaId), eq(roomPersonalMutes.mutedPersonaId, mutedPersonaId)));
  }
}

export async function reportToAdmins(db: Db, personaId: string, input: RoomReportRequest): Promise<void> {
  try {
    await db.insert(roomReports).values({
      reporterPersonaId: personaId,
      targetPersonaId: input.targetPersonaId ?? null,
      roomId: input.roomId ?? null,
      text: input.text,
      createdAt: new Date(),
    });
  } catch {
    throw new ApiError(400, 'validation_error', 'Не получилось отправить жалобу: проверьте данные');
  }
}
