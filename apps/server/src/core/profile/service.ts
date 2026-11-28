import {
  DEFAULT_PROFILE_PRIVACY,
  SIGNUP_MIN_AGE,
  ageOn,
  mediaPath,
  type Capability,
  type MyProfileResponse,
  type Profile,
  type ProfilePrivacy,
  type Role,
  type UpdateProfileRequest,
} from '@app/shared';
import { and, eq, ne } from 'drizzle-orm';
import { isUniqueViolation, type Db, type DbOrTx, type Tx } from '../../db/client';
import { accounts, profiles } from '../../db/schema';
import { getAccountStanding, requireCapability, requireNotBanned } from '../account';
import { ApiError, unauthorized } from '../errors';
import { deleteMedia, findOwnMedia, type MediaDeps } from '../media/service';

type ProfileRow = typeof profiles.$inferSelect;

// Служебные имена отвечают как занятые
const RESERVED_USERNAMES = new Set(['admin', 'administrator', 'support', 'moderator', 'help', 'system', 'root', 'kubsu', 'kubgu']);

const usernameTaken = () => new ApiError(409, 'username_taken', 'Этот никнейм занят');

// own — человек смотрит свой профиль: видит всё. Остальным скрытое не отдаём
function toProfile(row: ProfileRow, role: Role, own: boolean): Profile {
  return {
    profileId: row.id,
    displayName: row.displayName,
    avatarUrl: row.avatarMediaId ? mediaPath(row.avatarMediaId) : null,
    faculty: own || row.showFaculty ? row.faculty : null,
    // Курс есть только у студента, даже если роль поменяли позже
    course: role === 'student' && (own || row.showFaculty) ? row.course : null,
    about: row.about,
    role,
    username: row.username,
    department: role === 'teacher' ? row.department : null,
    links: row.links,
    birthDate: own || row.showBirth ? row.birthDate : null,
  };
}

const toPrivacy = (row: ProfileRow): ProfilePrivacy => ({
  showFaculty: row.showFaculty,
  showBirth: row.showBirth,
  showFriends: row.showFriends,
  showOnline: row.showOnline,
});

export async function getOwnProfile(db: Db, accountId: string): Promise<MyProfileResponse> {
  const account = await getAccountStanding(db, accountId);
  if (!account) throw unauthorized();
  const [row] = await db.select().from(profiles).where(eq(profiles.accountId, accountId));
  return row ? { profile: toProfile(row, account.role, true), privacy: toPrivacy(row) } : { profile: null, privacy: null };
}

export async function getProfileById(db: Db, profileId: string, viewerAccountId?: string): Promise<Profile> {
  const [found] = await db
    .select({ profile: profiles, role: accounts.role })
    .from(profiles)
    .innerJoin(accounts, eq(accounts.id, profiles.accountId))
    .where(eq(profiles.id, profileId));
  if (!found) throw new ApiError(404, 'not_found', 'Такого профиля нет');
  return toProfile(found.profile, found.role, found.profile.accountId === viewerAccountId);
}

// Свободен ли никнейм для этого человека (свой нынешний никнейм считается свободным)
export async function isUsernameAvailable(db: DbOrTx, accountId: string, username: string): Promise<boolean> {
  if (RESERVED_USERNAMES.has(username)) return false;
  const [taken] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.username, username), ne(profiles.accountId, accountId)));
  return !taken;
}

// Профиль сразу после регистрации с анкетой: имя и дата рождения из анкеты
export async function createInitialProfile(
  tx: Tx,
  accountId: string,
  input: { displayName: string; birthDate: string | null },
  now: Date,
): Promise<void> {
  await tx
    .insert(profiles)
    .values({ accountId, displayName: input.displayName, birthDate: input.birthDate, createdAt: now, updatedAt: now })
    .onConflictDoNothing({ target: profiles.accountId });
}

export async function saveOwnProfile(deps: MediaDeps, accountId: string, input: UpdateProfileRequest): Promise<MyProfileResponse> {
  const { db } = deps;
  const account = await getAccountStanding(db, accountId);
  if (!account) throw unauthorized();
  const [existing] = await db.select().from(profiles).where(eq(profiles.accountId, accountId));

  let avatarMediaId = existing?.avatarMediaId ?? null;
  if (input.avatarMediaId !== undefined) {
    if (input.avatarMediaId !== null && !(await findOwnMedia(db, accountId, input.avatarMediaId, 'avatar'))) {
      throw new ApiError(400, 'validation_error', 'Не получилось найти загруженное фото. Выберите его ещё раз');
    }
    avatarMediaId = input.avatarMediaId;
  }

  if (input.username && input.username !== existing?.username && !(await isUsernameAvailable(db, accountId, input.username))) {
    throw usernameTaken();
  }
  if (input.birthDate && (input.birthDate > isoDay(new Date()) || ageOn(input.birthDate, new Date()) < SIGNUP_MIN_AGE)) {
    throw new ApiError(400, 'validation_error', `Дата рождения: не младше ${SIGNUP_MIN_AGE} лет`);
  }

  const now = new Date();
  // Не переданное необязательное поле не трогаем
  const keep = <T>(next: T | undefined, current: T): T => (next === undefined ? current : next);
  const values = {
    displayName: input.displayName,
    avatarMediaId,
    faculty: keep(input.faculty, existing?.faculty ?? null),
    course: account.role !== 'student' ? null : keep(input.course, existing?.course ?? null),
    about: keep(input.about, existing?.about ?? null),
    username: keep(input.username, existing?.username ?? null),
    department: account.role !== 'teacher' ? null : keep(input.department, existing?.department ?? null),
    links: keep(input.links, existing?.links ?? []),
    birthDate: keep(input.birthDate, existing?.birthDate ?? null),
    showFaculty: keep(input.privacy?.showFaculty, existing?.showFaculty ?? DEFAULT_PROFILE_PRIVACY.showFaculty),
    showBirth: keep(input.privacy?.showBirth, existing?.showBirth ?? DEFAULT_PROFILE_PRIVACY.showBirth),
    showFriends: keep(input.privacy?.showFriends, existing?.showFriends ?? DEFAULT_PROFILE_PRIVACY.showFriends),
    showOnline: keep(input.privacy?.showOnline, existing?.showOnline ?? DEFAULT_PROFILE_PRIVACY.showOnline),
    updatedAt: now,
  };
  let saved: ProfileRow | undefined;
  try {
    [saved] = await db
      .insert(profiles)
      .values({ accountId, createdAt: now, ...values })
      .onConflictDoUpdate({ target: profiles.accountId, set: values })
      .returning();
  } catch (error) {
    // Двое одновременно заняли один никнейм
    if (isUniqueViolation(error)) throw usernameTaken();
    throw error;
  }

  // Старый аватар больше нигде не используется — удаляем вместе с файлом
  if (existing?.avatarMediaId && existing.avatarMediaId !== avatarMediaId) {
    await deleteMedia(deps, existing.avatarMediaId);
  }
  return { profile: toProfile(saved!, account.role, true), privacy: toPrivacy(saved!) };
}

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

export type ProfileRef = { profileId: string; role: Role };

const profileRequired = () => new ApiError(409, 'profile_required', 'Сначала заполните профиль');

// Для модулей соцсети: «кто я» в виде открытого профиля. Заодно проверяет право роли.
// write: 'new' — запрос создаёт новое (пост, лайк, комментарий, историю): забаненному это запрещено.
export async function requireProfile(db: Db, accountId: string, capability?: Capability, write?: 'new'): Promise<ProfileRef> {
  const account = capability ? await requireCapability(db, accountId, capability) : await getAccountStanding(db, accountId);
  if (!account) throw unauthorized();
  if (write === 'new') requireNotBanned(account, new Date());
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.accountId, accountId));
  if (!row) throw profileRequired();
  return { profileId: row.id, role: account.role };
}

// Для чтения: профиль может быть ещё не заполнен
export async function findProfileId(db: Db, accountId: string): Promise<string | null> {
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.accountId, accountId));
  return row?.id ?? null;
}
