import { randomUUID } from 'node:crypto';
import { ROOM_CAPACITY, type JoinRoomResponse } from '@app/shared';
import { and, asc, eq, inArray, isNull, lte } from 'drizzle-orm';
import { isUniqueViolation, type Db } from '../../../db/client';
import { personas, roomParticipations, rooms, slots } from '../../../db/schema';
import { getAccountStanding, isBanned } from '../../../core/account';
import { ApiError, unauthorized } from '../../../core/errors';
import { blockedUntil, mutedUntil } from '../moderation/service';
import { isJoinable, slotEndsAt } from '../schedule/service';
import type { VoiceGateway } from '../voice/gateway';

const TOKEN_GRACE_SECONDS = 60;
const MAX_SLOT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export type RoomDeps = {
  db: Db;
  // null — сервер звука не настроен
  voice: VoiceGateway | null;
  onError: (error: unknown) => void;
};

const voiceUnavailable = () =>
  new ApiError(503, 'voice_unavailable', 'Комнаты временно недоступны. Попробуйте через минуту');
const roomNotOpen = () => new ApiError(409, 'room_not_open', 'Эта комната сейчас закрыта');

type Room = typeof rooms.$inferSelect;

async function pickRoom(db: Db, voice: VoiceGateway, slotId: string, personaId: string, now: Date): Promise<Room> {
  const open = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.slotId, slotId), isNull(rooms.closedAt)))
    .orderBy(asc(rooms.index));

  // Вернулся после обрыва связи — в ту же комнату, даже если она уже полная
  if (open.length > 0) {
    const [mine] = await db
      .select({ roomId: roomParticipations.roomId })
      .from(roomParticipations)
      .where(
        and(
          eq(roomParticipations.personaId, personaId),
          isNull(roomParticipations.leftAt),
          inArray(roomParticipations.roomId, open.map((room) => room.id)),
        ),
      );
    const previous = open.find((room) => room.id === mine?.roomId);
    if (previous) return previous;
  }

  for (const room of open) {
    if ((await voice.countParticipants(room.voiceRoomName)) < ROOM_CAPACITY) return room;
  }

  const all = await db.select({ index: rooms.index }).from(rooms).where(eq(rooms.slotId, slotId));
  const nextIndex = Math.max(0, ...all.map((room) => room.index)) + 1;
  try {
    const [created] = await db
      .insert(rooms)
      .values({ slotId, index: nextIndex, voiceRoomName: randomUUID(), openedAt: now })
      .returning();
    return created!;
  } catch (error) {
    // Двое одновременно открывали новую комнату — берём ту, что создал другой
    if (!isUniqueViolation(error)) throw error;
    const [existing] = await db.select().from(rooms).where(and(eq(rooms.slotId, slotId), eq(rooms.index, nextIndex)));
    if (!existing) throw error;
    return existing;
  }
}

export async function joinSlot(
  deps: RoomDeps,
  who: { accountId: string; personaId: string },
  slotId: string,
  now: Date,
): Promise<JoinRoomResponse> {
  const { db, voice } = deps;

  const account = await getAccountStanding(db, who.accountId);
  if (!account) throw unauthorized();
  if (isBanned(account, now)) throw new ApiError(403, 'account_banned', 'Вход в комнаты для вас временно закрыт');

  const [persona] = await db.select({ nickname: personas.nickname }).from(personas).where(eq(personas.id, who.personaId));
  if (!persona) throw unauthorized();
  if (persona.nickname === null) throw new ApiError(409, 'nickname_required', 'Сначала придумайте ник');

  const [slot] = await db.select().from(slots).where(eq(slots.id, slotId));
  if (!slot) throw new ApiError(404, 'not_found', 'Такой комнаты нет');
  if (!isJoinable(slot, now)) throw roomNotOpen();
  // Выгнали или автобан: вход во все комнаты закрыт до конца срока
  if (await blockedUntil(db, who.personaId, now)) {
    throw new ApiError(403, 'room_blocked', 'Вход в комнаты для вас временно закрыт по решению участников');
  }
  if (!voice) throw voiceUnavailable();

  const endsAt = slotEndsAt(slot);
  let room: Room;
  let voiceToken: string;
  try {
    room = await pickRoom(db, voice, slot.id, who.personaId, now);
    voiceToken = await voice.createToken({
      roomName: room.voiceRoomName,
      identity: who.personaId,
      name: persona.nickname,
      ttlSeconds: (endsAt.getTime() - now.getTime()) / 1000 + TOKEN_GRACE_SECONDS,
      // Перезаход не возвращает микрофон, выключенный голосованием
      canPublish: (await mutedUntil(db, who.personaId, room.id, now)) === null,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    deps.onError(error);
    throw voiceUnavailable();
  }

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: roomParticipations.id, roomId: roomParticipations.roomId })
      .from(roomParticipations)
      .where(and(eq(roomParticipations.personaId, who.personaId), isNull(roomParticipations.leftAt)));
    if (current?.roomId === room.id) return;
    await tx
      .update(roomParticipations)
      .set({ leftAt: now })
      .where(and(eq(roomParticipations.personaId, who.personaId), isNull(roomParticipations.leftAt)));
    await tx.insert(roomParticipations).values({ roomId: room.id, personaId: who.personaId, joinedAt: now });
  });

  return { roomId: room.id, voiceUrl: voice.url, voiceToken, endsAt: endsAt.toISOString() };
}

export async function leaveRoom(db: Db, personaId: string, roomId: string, now: Date): Promise<void> {
  await db
    .update(roomParticipations)
    .set({ leftAt: now, handRaisedAt: null })
    .where(
      and(eq(roomParticipations.roomId, roomId), eq(roomParticipations.personaId, personaId), isNull(roomParticipations.leftAt)),
    );
}

// Закрывает комнаты, у которых вышло время: всех отключает от звука и отмечает уход
export async function closeFinishedRooms(deps: RoomDeps, now: Date): Promise<void> {
  const candidates = await deps.db
    .select({ room: rooms, slot: slots })
    .from(rooms)
    .innerJoin(slots, eq(slots.id, rooms.slotId))
    .where(and(isNull(rooms.closedAt), lte(slots.startsAt, now)));

  for (const { room, slot } of candidates) {
    const finished = slot.status === 'cancelled' || slotEndsAt(slot) <= now;
    if (!finished) continue;
    try {
      await deps.voice?.closeRoom(room.voiceRoomName);
    } catch (error) {
      // Сервер звука недоступен — попробуем на следующем проходе
      deps.onError(error);
      if (now.getTime() - slotEndsAt(slot).getTime() < MAX_SLOT_LOOKBACK_MS) continue;
    }
    await deps.db.update(rooms).set({ closedAt: now }).where(eq(rooms.id, room.id));
    await deps.db
      .update(roomParticipations)
      .set({ leftAt: now })
      .where(and(eq(roomParticipations.roomId, room.id), isNull(roomParticipations.leftAt)));
  }
}
