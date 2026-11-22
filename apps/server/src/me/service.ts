import {
  NICKNAME_CHANGE_INTERVAL_DAYS,
  NICKNAME_PROBLEM_TEXT,
  checkNickname,
  nicknameKey,
  normalizeNickname,
  type MeResponse,
} from '@rooms/shared';
import { eq } from 'drizzle-orm';
import { isUniqueViolation, type Db } from '../db/client';
import { personas } from '../db/schema';
import { ApiError, unauthorized } from '../errors';

const NICKNAME_CHANGE_INTERVAL_MS = NICKNAME_CHANGE_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

const nicknameTaken = () => new ApiError(409, 'nickname_taken', 'Этот ник занят');

async function loadPersona(db: Db, personaId: string) {
  const [persona] = await db.select().from(personas).where(eq(personas.id, personaId));
  if (!persona) throw unauthorized();
  return persona;
}

function changeAvailableAt(changedAt: Date | null): Date | null {
  return changedAt ? new Date(changedAt.getTime() + NICKNAME_CHANGE_INTERVAL_MS) : null;
}

function toResponse(persona: Awaited<ReturnType<typeof loadPersona>>, now: Date): MeResponse {
  const availableAt = changeAvailableAt(persona.nicknameChangedAt);
  return {
    personaId: persona.id,
    nickname: persona.nickname,
    nicknameChangeAvailableAt: availableAt && availableAt > now ? availableAt.toISOString() : null,
  };
}

export async function getMe(db: Db, personaId: string): Promise<MeResponse> {
  return toResponse(await loadPersona(db, personaId), new Date());
}

export async function setNickname(db: Db, personaId: string, rawNickname: string): Promise<MeResponse> {
  const problem = checkNickname(rawNickname);
  if (problem) {
    if (problem === 'reserved') throw nicknameTaken();
    throw new ApiError(400, 'nickname_invalid', NICKNAME_PROBLEM_TEXT[problem]);
  }
  const nickname = normalizeNickname(rawNickname);
  const now = new Date();
  const persona = await loadPersona(db, personaId);

  if (persona.nickname === nickname) return toResponse(persona, now);

  const availableAt = changeAvailableAt(persona.nicknameChangedAt);
  if (availableAt && availableAt > now) {
    throw new ApiError(
      409,
      'nickname_change_too_soon',
      `Ник можно менять раз в ${NICKNAME_CHANGE_INTERVAL_DAYS} дней`,
    );
  }

  try {
    const [updated] = await db
      .update(personas)
      .set({ nickname, nicknameKey: nicknameKey(nickname), nicknameChangedAt: now })
      .where(eq(personas.id, personaId))
      .returning();
    return toResponse(updated!, now);
  } catch (error) {
    if (isUniqueViolation(error)) throw nicknameTaken();
    throw error;
  }
}
