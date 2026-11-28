// Сверка с сервером звука: кто на самом деле в комнате.
// Нужна, потому что человек может закрыть вкладку, потерять связь или подключиться к звуку в обход нашего сервера
// (пропуск на сервер звука действует до конца комнаты и после «выгнали»).

import { and, eq, gt, inArray, isNull } from 'drizzle-orm';
import type { Db } from '../../../db/client';
import { personas, roomParticipations, roomSanctions, rooms } from '../../../db/schema';
import type { VoiceGateway } from '../voice/gateway';

// Сколько ждём после входа, прежде чем считать, что человек так и не подключился к звуку
export const PRESENCE_GRACE_MS = 45 * 1000;

export type PresenceDeps = {
  db: Db;
  voice: VoiceGateway | null;
  onError: (error: unknown) => void;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function syncPresence(deps: PresenceDeps, now: Date): Promise<void> {
  const { db, voice } = deps;
  if (!voice) return;
  const open = await db.select().from(rooms).where(isNull(rooms.closedAt));

  for (const room of open) {
    let present: string[];
    try {
      present = await voice.listIdentities(room.voiceRoomName);
    } catch (error) {
      // Сервер звука недоступен — ничего не трогаем, сверим на следующем проходе
      deps.onError(error);
      continue;
    }
    try {
      await syncRoom(deps, voice, room, present.filter((identity) => UUID.test(identity)), now);
    } catch (error) {
      deps.onError(error);
    }
  }
}

async function syncRoom(
  deps: PresenceDeps,
  voice: VoiceGateway,
  room: typeof rooms.$inferSelect,
  present: string[],
  now: Date,
): Promise<void> {
  const { db } = deps;

  // 1. Кому вход закрыт (выгнали, автобан, блокировка админа), а он всё ещё на связи — отключаем
  const blocked = new Set<string>();
  if (present.length > 0) {
    const rows = await db
      .select({ personaId: roomSanctions.personaId })
      .from(roomSanctions)
      .where(
        and(
          inArray(roomSanctions.personaId, present),
          inArray(roomSanctions.type, ['room_block', 'rooms_ban']),
          gt(roomSanctions.endsAt, now),
        ),
      );
    for (const row of rows) blocked.add(row.personaId);
  }
  for (const personaId of blocked) await voice.removeParticipant(room.voiceRoomName, personaId).catch(deps.onError);
  const allowed = present.filter((personaId) => !blocked.has(personaId));

  // 2. У кого микрофон выключен голосованием — запрет говорить держится и после переподключения
  if (allowed.length > 0) {
    const muted = await db
      .select({ personaId: roomSanctions.personaId })
      .from(roomSanctions)
      .where(
        and(
          inArray(roomSanctions.personaId, allowed),
          eq(roomSanctions.type, 'mute'),
          eq(roomSanctions.roomId, room.id),
          isNull(roomSanctions.liftedAt),
          gt(roomSanctions.endsAt, now),
        ),
      );
    for (const personaId of new Set(muted.map((item) => item.personaId))) {
      await voice.setCanPublish(room.voiceRoomName, personaId, false).catch(deps.onError);
    }
  }

  // 3. Записи о присутствии: кто ушёл — отмечаем уход; кто на связи без записи — записываем
  const records = await db
    .select({ id: roomParticipations.id, personaId: roomParticipations.personaId, joinedAt: roomParticipations.joinedAt })
    .from(roomParticipations)
    .where(and(eq(roomParticipations.roomId, room.id), isNull(roomParticipations.leftAt)));

  const here = new Set(allowed);
  const gone = records.filter(
    (record) => !here.has(record.personaId) && now.getTime() - record.joinedAt.getTime() >= PRESENCE_GRACE_MS,
  );
  if (gone.length > 0) {
    await db
      .update(roomParticipations)
      .set({ leftAt: now, handRaisedAt: null })
      .where(inArray(roomParticipations.id, gone.map((record) => record.id)));
  }

  const recorded = new Set(records.map((record) => record.personaId));
  const missing = allowed.filter((personaId) => !recorded.has(personaId));
  if (missing.length > 0) {
    // Только настоящие персоны: посторонних идентификаторов в базе нет
    const known = await db.select({ id: personas.id }).from(personas).where(inArray(personas.id, missing));
    for (const { id } of known) {
      await db.transaction(async (tx) => {
        // Один человек — в одной комнате: прежняя запись закрывается
        await tx
          .update(roomParticipations)
          .set({ leftAt: now, handRaisedAt: null })
          .where(and(eq(roomParticipations.personaId, id), isNull(roomParticipations.leftAt)));
        await tx.insert(roomParticipations).values({ roomId: room.id, personaId: id, joinedAt: now });
      });
    }
  }
}

// ---------- «Поднять руку» ----------

// Возвращает false, если человека сейчас нет в этой комнате
export async function setHand(db: Db, personaId: string, roomId: string, raised: boolean, now: Date): Promise<boolean> {
  const [current] = await db
    .select({ id: roomParticipations.id, handRaisedAt: roomParticipations.handRaisedAt })
    .from(roomParticipations)
    .where(and(eq(roomParticipations.roomId, roomId), eq(roomParticipations.personaId, personaId), isNull(roomParticipations.leftAt)));
  if (!current) return false;
  // Повторное «поднять» не меняет очередь
  if (raised === (current.handRaisedAt !== null)) return true;
  await db
    .update(roomParticipations)
    .set({ handRaisedAt: raised ? now : null })
    .where(eq(roomParticipations.id, current.id));
  return true;
}

export async function listRaisedHands(db: Db, roomId: string): Promise<string[]> {
  const rows = await db
    .select({ personaId: roomParticipations.personaId, at: roomParticipations.handRaisedAt })
    .from(roomParticipations)
    .where(and(eq(roomParticipations.roomId, roomId), isNull(roomParticipations.leftAt)));
  return rows
    .filter((row): row is { personaId: string; at: Date } => row.at !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((row) => row.personaId);
}
