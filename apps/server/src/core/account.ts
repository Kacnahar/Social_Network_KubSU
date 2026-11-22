import { can, type Capability, type Role } from '@app/shared';
import { eq } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client';
import { accounts, mediaFiles } from '../db/schema';
import { ApiError, unauthorized } from './errors';
import { deletePersonaOfAccount } from './identity';
import type { MediaStorage } from './media/storage';

export type AccountStanding = { role: Role; status: 'active' | 'banned'; bannedUntil: Date | null };

export async function getAccountStanding(db: DbOrTx, accountId: string): Promise<AccountStanding | null> {
  const [account] = await db
    .select({ role: accounts.role, status: accounts.status, bannedUntil: accounts.bannedUntil })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  return account ?? null;
}

// Бан без срока — бессрочный; бан с истёкшим сроком уже не действует
export function isBanned(standing: Pick<AccountStanding, 'status' | 'bannedUntil'>, now: Date): boolean {
  return standing.status === 'banned' && (standing.bannedUntil === null || standing.bannedUntil > now);
}

export const forbidden = () => new ApiError(403, 'forbidden', 'Для вашей роли это недоступно');

// Проверка роли на сервере: скрытая в приложении кнопка защитой не считается
export async function requireCapability(db: DbOrTx, accountId: string, capability: Capability): Promise<AccountStanding> {
  const account = await getAccountStanding(db, accountId);
  if (!account) throw unauthorized();
  if (!can(account.role, capability)) throw forbidden();
  return account;
}

// Удаляет всё, что есть у человека: аккаунт, профиль, фото (и сами файлы), персону комнат
export async function deleteAccount(deps: { db: Db; media: MediaStorage }, accountId: string): Promise<void> {
  const files = await deps.db
    .select({ storageKey: mediaFiles.storageKey })
    .from(mediaFiles)
    .where(eq(mediaFiles.ownerAccountId, accountId));
  await deps.db.transaction(async (tx) => {
    await deletePersonaOfAccount(tx, accountId);
    await tx.delete(accounts).where(eq(accounts.id, accountId));
  });
  await Promise.all(files.map((file) => deps.media.delete(file.storageKey)));
}
