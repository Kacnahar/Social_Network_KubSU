import { eq } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { accounts } from '../db/schema';

export type AccountStanding = { status: 'active' | 'banned'; bannedUntil: Date | null };

export async function getAccountStanding(db: DbOrTx, accountId: string): Promise<AccountStanding | null> {
  const [account] = await db
    .select({ status: accounts.status, bannedUntil: accounts.bannedUntil })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  return account ?? null;
}

// Бан без срока — бессрочный; бан с истёкшим сроком уже не действует
export function isBanned(standing: AccountStanding, now: Date): boolean {
  return standing.status === 'banned' && (standing.bannedUntil === null || standing.bannedUntil > now);
}
