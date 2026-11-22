// Единственное место в коде, которое знает связь «аккаунт ↔ персона».
// Таблицу persona_links нельзя импортировать за пределами этой папки — это проверяет автотест.

import { eq } from 'drizzle-orm';
import type { DbOrTx, Tx } from '../../db/client';
import { accounts, personaLinks, personas } from '../../db/schema';
import { unauthorized } from '../errors';

export async function findAccountIdByEmailHash(db: DbOrTx, emailHash: string): Promise<string | null> {
  const [row] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.emailHash, emailHash));
  return row?.id ?? null;
}

export async function createAccountWithPersona(
  tx: Tx,
  input: { emailHash: string; emailEncrypted: string; inviteCodeId: string; now: Date },
): Promise<string> {
  const [account] = await tx
    .insert(accounts)
    .values({
      emailHash: input.emailHash,
      emailEncrypted: input.emailEncrypted,
      inviteCodeId: input.inviteCodeId,
      createdAt: input.now,
    })
    .returning({ id: accounts.id });
  const [persona] = await tx.insert(personas).values({ createdAt: input.now }).returning({ id: personas.id });
  await tx.insert(personaLinks).values({ accountId: account!.id, personaId: persona!.id });
  return account!.id;
}

export async function getPersonaIdForAccount(db: DbOrTx, accountId: string): Promise<string> {
  const [link] = await db
    .select({ personaId: personaLinks.personaId })
    .from(personaLinks)
    .where(eq(personaLinks.accountId, accountId));
  if (!link) throw unauthorized();
  return link.personaId;
}

export async function deleteAccountAndPersona(tx: Tx, accountId: string): Promise<void> {
  const personaId = await getPersonaIdForAccount(tx, accountId);
  await tx.delete(personas).where(eq(personas.id, personaId));
  await tx.delete(accounts).where(eq(accounts.id, accountId));
}
