import { normalizeInviteCode, type AuthStartRequest, type AuthVerifyRequest } from '@app/shared';
import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import type { Config } from '../../config';
import {
  encryptEmail,
  generateLoginCode,
  generateSessionToken,
  hashEmail,
  hashLoginCode,
  hashSessionToken,
  safeEqual,
} from '../crypto';
import type { Db, DbOrTx } from '../../db/client';
import { emailLoginCodes, inviteCodes, sessions } from '../../db/schema';
import { ApiError, invalidCode, invalidInvite, unauthorized } from '../errors';
import { createAccountWithPersona, findAccountIdByEmailHash } from '../identity';
import type { Mailer } from '../mailer';

const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
const LOGIN_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const LOGIN_CODE_MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type AuthDeps = {
  db: Db;
  config: Config;
  mailer: Mailer;
  onMailError: (error: unknown) => void;
};

const inviteIsUsable = (now: Date) =>
  and(
    lt(inviteCodes.usedCount, inviteCodes.maxUses),
    or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
  );

async function findUsableInviteId(db: DbOrTx, rawCode: string, now: Date): Promise<string | null> {
  const [invite] = await db
    .select({ id: inviteCodes.id })
    .from(inviteCodes)
    .where(and(eq(inviteCodes.code, normalizeInviteCode(rawCode)), inviteIsUsable(now)));
  return invite?.id ?? null;
}

export async function startLogin(deps: AuthDeps, input: AuthStartRequest): Promise<{ devCode?: string }> {
  const { db, config } = deps;
  const now = new Date();
  const emailHash = hashEmail(input.email, config.emailHashKey);

  const [previous] = await db
    .select({ createdAt: emailLoginCodes.createdAt })
    .from(emailLoginCodes)
    .where(eq(emailLoginCodes.emailHash, emailHash));
  if (previous && now.getTime() - previous.createdAt.getTime() < LOGIN_CODE_RESEND_COOLDOWN_MS) {
    throw new ApiError(429, 'too_many_requests', 'Код уже отправлен. Попробуйте через минуту');
  }

  let inviteCodeId: string | null = null;
  let deliverable: boolean;
  if (input.inviteCode !== undefined) {
    inviteCodeId = await findUsableInviteId(db, input.inviteCode, now);
    if (!inviteCodeId) throw invalidInvite();
    deliverable = true;
  } else {
    // Вход без приглашения: письмо уходит только если аккаунт есть, но ответ всегда одинаковый
    deliverable = (await findAccountIdByEmailHash(db, emailHash)) !== null;
  }

  const code = generateLoginCode();
  const row = {
    emailHash,
    codeHash: hashLoginCode(code, emailHash, config.emailHashKey),
    inviteCodeId,
    deliverable,
    attempts: 0,
    expiresAt: new Date(now.getTime() + LOGIN_CODE_TTL_MS),
    createdAt: now,
  };
  await db.insert(emailLoginCodes).values(row).onConflictDoUpdate({ target: emailLoginCodes.emailHash, set: row });

  if (!deliverable) return {};
  // Не ждём отправки, чтобы по времени ответа нельзя было понять, есть ли аккаунт
  void deps.mailer.sendLoginCode(input.email, code).catch(deps.onMailError);
  return config.devExposeLoginCodes ? { devCode: code } : {};
}

export async function verifyLogin(deps: AuthDeps, input: AuthVerifyRequest): Promise<{ token: string }> {
  const { db, config } = deps;
  const now = new Date();
  const emailHash = hashEmail(input.email, config.emailHashKey);

  const [row] = await db.select().from(emailLoginCodes).where(eq(emailLoginCodes.emailHash, emailHash));
  if (!row) throw invalidCode();

  const codeMatches = safeEqual(row.codeHash, hashLoginCode(input.code, emailHash, config.emailHashKey));
  const usable = row.deliverable && row.expiresAt > now && row.attempts < LOGIN_CODE_MAX_ATTEMPTS;
  if (!codeMatches || !usable) {
    await db
      .update(emailLoginCodes)
      .set({ attempts: sql`${emailLoginCodes.attempts} + 1` })
      .where(eq(emailLoginCodes.emailHash, emailHash));
    throw invalidCode();
  }

  const token = generateSessionToken();
  await db.transaction(async (tx) => {
    await tx.delete(emailLoginCodes).where(eq(emailLoginCodes.emailHash, emailHash));

    let accountId = await findAccountIdByEmailHash(tx, emailHash);
    if (!accountId) {
      if (!row.inviteCodeId) throw invalidCode();
      const [consumed] = await tx
        .update(inviteCodes)
        .set({ usedCount: sql`${inviteCodes.usedCount} + 1` })
        .where(and(eq(inviteCodes.id, row.inviteCodeId), inviteIsUsable(now)))
        .returning({ id: inviteCodes.id });
      if (!consumed) throw invalidInvite();
      accountId = await createAccountWithPersona(tx, {
        emailHash,
        emailEncrypted: encryptEmail(input.email, config.emailEncryptionKey),
        inviteCodeId: consumed.id,
        now,
      });
    }

    await tx.insert(sessions).values({
      tokenHash: hashSessionToken(token),
      accountId,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      createdAt: now,
    });
  });

  return { token };
}

export type Session = { sessionId: string; accountId: string };

export async function authenticate(db: Db, authorizationHeader: string | undefined): Promise<Session> {
  const token = authorizationHeader?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw unauthorized();
  const [session] = await db
    .select({ sessionId: sessions.id, accountId: sessions.accountId })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())));
  if (!session) throw unauthorized();
  return session;
}

export async function endSession(db: Db, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
