import { mediaPath, type Capability, type Profile, type Role, type UpdateProfileRequest } from '@app/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { accounts, profiles } from '../../db/schema';
import { getAccountStanding, requireCapability } from '../account';
import { ApiError, unauthorized } from '../errors';
import { deleteMedia, findOwnMedia, type MediaDeps } from '../media/service';

type ProfileRow = typeof profiles.$inferSelect;

function toProfile(row: ProfileRow, role: Role): Profile {
  return {
    profileId: row.id,
    displayName: row.displayName,
    avatarUrl: row.avatarMediaId ? mediaPath(row.avatarMediaId) : null,
    faculty: row.faculty,
    // Курс есть только у студента, даже если роль поменяли позже
    course: role === 'student' ? row.course : null,
    about: row.about,
    role,
  };
}

export async function getOwnProfile(db: Db, accountId: string): Promise<Profile | null> {
  const account = await getAccountStanding(db, accountId);
  if (!account) throw unauthorized();
  const [row] = await db.select().from(profiles).where(eq(profiles.accountId, accountId));
  return row ? toProfile(row, account.role) : null;
}

export async function getProfileById(db: Db, profileId: string): Promise<Profile> {
  const [found] = await db
    .select({ profile: profiles, role: accounts.role })
    .from(profiles)
    .innerJoin(accounts, eq(accounts.id, profiles.accountId))
    .where(eq(profiles.id, profileId));
  if (!found) throw new ApiError(404, 'not_found', 'Такого профиля нет');
  return toProfile(found.profile, found.role);
}

export async function saveOwnProfile(deps: MediaDeps, accountId: string, input: UpdateProfileRequest): Promise<Profile> {
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

  const now = new Date();
  const values = {
    displayName: input.displayName,
    avatarMediaId,
    // Не переданное необязательное поле не трогаем
    faculty: input.faculty === undefined ? (existing?.faculty ?? null) : input.faculty,
    course: account.role !== 'student' ? null : input.course === undefined ? (existing?.course ?? null) : input.course,
    about: input.about === undefined ? (existing?.about ?? null) : input.about,
    updatedAt: now,
  };
  const [saved] = await db
    .insert(profiles)
    .values({ accountId, createdAt: now, ...values })
    .onConflictDoUpdate({ target: profiles.accountId, set: values })
    .returning();

  // Старый аватар больше нигде не используется — удаляем вместе с файлом
  if (existing?.avatarMediaId && existing.avatarMediaId !== avatarMediaId) {
    await deleteMedia(deps, existing.avatarMediaId);
  }
  return toProfile(saved!, account.role);
}

export type ProfileRef = { profileId: string; role: Role };

const profileRequired = () => new ApiError(409, 'profile_required', 'Сначала заполните профиль');

// Для модулей соцсети: «кто я» в виде открытого профиля. Заодно проверяет право роли.
export async function requireProfile(db: Db, accountId: string, capability?: Capability): Promise<ProfileRef> {
  const account = capability ? await requireCapability(db, accountId, capability) : await getAccountStanding(db, accountId);
  if (!account) throw unauthorized();
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.accountId, accountId));
  if (!row) throw profileRequired();
  return { profileId: row.id, role: account.role };
}

// Для чтения: профиль может быть ещё не заполнен
export async function findProfileId(db: Db, accountId: string): Promise<string | null> {
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.accountId, accountId));
  return row?.id ?? null;
}
