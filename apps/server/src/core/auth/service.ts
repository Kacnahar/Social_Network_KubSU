import {
  PROFILE_NAME_MAX,
  SIGNUP_MIN_AGE,
  TEST_LOGIN_CODE,
  ageOn,
  isTestLoginEmail,
  normalizeInviteCode,
  type AuthStartRequest,
  type AuthVerifyRequest,
  type Signup,
} from '@app/shared';
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
import { accounts, emailLoginCodes, inviteCodes, sessions } from '../../db/schema';
import { ApiError, invalidCode, invalidInvite, unauthorized } from '../errors';
import { createAccount, findAccountIdByEmailHash } from '../identity';
import type { Mailer } from '../mailer';
import { createInitialProfile } from '../profile/service';

const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
const LOGIN_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const LOGIN_CODE_MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const GUEST_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

// Имя для открытого профиля: «Имя Фамилия», у преподавателя — «Имя Отчество Фамилия», если помещается
export function displayNameOfSignup(signup: Signup): string {
  const short = `${signup.firstName} ${signup.lastName}`;
  if (signup.role !== 'teacher' || !signup.patronymic) return short;
  const full = `${signup.firstName} ${signup.patronymic} ${signup.lastName}`;
  return full.length <= PROFILE_NAME_MAX ? full : short;
}

function checkSignup(signup: Signup, now: Date): void {
  if (displayNameOfSignup(signup).length > PROFILE_NAME_MAX) {
    throw new ApiError(400, 'validation_error', `Имя и фамилия вместе — не длиннее ${PROFILE_NAME_MAX} знаков`);
  }
  if (signup.role !== 'student') return;
  const today = now.toISOString().slice(0, 10);
  if (signup.birthDate > today || signup.birthDate < '1900-01-01') {
    throw new ApiError(400, 'validation_error', 'Проверьте дату рождения');
  }
  if (ageOn(signup.birthDate, now) < SIGNUP_MIN_AGE) {
    throw new ApiError(400, 'validation_error', `Регистрация — с ${SIGNUP_MIN_AGE} лет`);
  }
}

export async function startLogin(deps: AuthDeps, input: AuthStartRequest): Promise<{ devCode?: string }> {
  const { db, config } = deps;
  const now = new Date();
  const emailHash = hashEmail(input.email, config.emailHashKey);
  // Тестовый аккаунт разработки: постоянный код, без ожидания между отправками
  const testLogin = config.devTestAccounts && isTestLoginEmail(input.email);

  const [previous] = await db
    .select({ createdAt: emailLoginCodes.createdAt })
    .from(emailLoginCodes)
    .where(eq(emailLoginCodes.emailHash, emailHash));
  if (!testLogin && previous && now.getTime() - previous.createdAt.getTime() < LOGIN_CODE_RESEND_COOLDOWN_MS) {
    throw new ApiError(429, 'too_many_requests', 'Код уже отправлен. Попробуйте через минуту');
  }

  let inviteCodeId: string | null = null;
  let signup: Signup | null = null;
  let deliverable: boolean;
  if (input.inviteCode !== undefined) {
    inviteCodeId = await findUsableInviteId(db, input.inviteCode, now);
    if (!inviteCodeId) throw invalidInvite();
    deliverable = true;
  } else if (input.signup) {
    // Регистрация с анкетой. Если почта уже зарегистрирована — это просто вход, анкету не храним.
    // Письмо уходит в обоих случаях, поэтому по ответу нельзя понять, есть ли аккаунт
    checkSignup(input.signup, now);
    if ((await findAccountIdByEmailHash(db, emailHash)) === null) signup = input.signup;
    deliverable = true;
  } else {
    // Вход без приглашения: письмо уходит только если аккаунт есть, но ответ всегда одинаковый
    deliverable = (await findAccountIdByEmailHash(db, emailHash)) !== null;
  }

  const code = testLogin ? TEST_LOGIN_CODE : generateLoginCode();
  const row = {
    emailHash,
    codeHash: hashLoginCode(code, emailHash, config.emailHashKey),
    inviteCodeId,
    signup,
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
    if (!accountId && row.signup) {
      const signup = row.signup;
      accountId = await createAccount(tx, {
        emailHash,
        emailEncrypted: encryptEmail(input.email, config.emailEncryptionKey),
        role: signup.role,
        now,
        person: {
          lastName: signup.lastName,
          firstName: signup.firstName,
          patronymic: signup.role === 'teacher' ? signup.patronymic : null,
          gender: signup.role === 'student' ? signup.gender : null,
          staffId: signup.role === 'teacher' ? signup.staffId : null,
        },
      });
      // Профиль создаётся сразу: человек попадает прямо в ленту
      await createInitialProfile(
        tx,
        accountId,
        { displayName: displayNameOfSignup(signup), birthDate: signup.role === 'student' ? signup.birthDate : null },
        now,
      );
    } else if (!accountId) {
      if (!row.inviteCodeId) throw invalidCode();
      const [consumed] = await tx
        .update(inviteCodes)
        .set({ usedCount: sql`${inviteCodes.usedCount} + 1` })
        .where(and(eq(inviteCodes.id, row.inviteCodeId), inviteIsUsable(now)))
        .returning({ id: inviteCodes.id, role: inviteCodes.role });
      if (!consumed) throw invalidInvite();
      accountId = await createAccount(tx, {
        emailHash,
        emailEncrypted: encryptEmail(input.email, config.emailEncryptionKey),
        inviteCodeId: consumed.id,
        role: consumed.role,
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

// ---------- Гость без регистрации ----------

// Гость входит одной кнопкой: создаётся аккаунт без почты с ролью «гость» — только просмотр
export async function startGuestSession(db: Db): Promise<{ token: string }> {
  const now = new Date();
  const token = generateSessionToken();
  await db.transaction(async (tx) => {
    const accountId = await createAccount(tx, { emailHash: null, emailEncrypted: null, role: 'guest', now });
    await tx.insert(sessions).values({
      tokenHash: hashSessionToken(token),
      accountId,
      expiresAt: new Date(now.getTime() + GUEST_SESSION_TTL_MS),
      createdAt: now,
    });
  });
  return { token };
}

export async function isEmaillessGuest(db: DbOrTx, accountId: string): Promise<boolean> {
  const [account] = await db.select({ emailHash: accounts.emailHash }).from(accounts).where(eq(accounts.id, accountId));
  return account !== undefined && account.emailHash === null;
}

// Гостевые аккаунты, у которых не осталось действующих сессий: вернуться в них уже нельзя
export async function findAbandonedGuestIds(db: DbOrTx, now: Date): Promise<string[]> {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .leftJoin(sessions, and(eq(sessions.accountId, accounts.id), gt(sessions.expiresAt, now)))
    .where(and(isNull(accounts.emailHash), isNull(sessions.id)));
  return rows.map((row) => row.id);
}
