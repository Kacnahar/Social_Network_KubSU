// Единственное место в коде, которое знает связь «аккаунт ↔ персона комнат».
// Таблицу persona_links нельзя импортировать за пределами этой папки — это проверяет автотест.

import type { Role } from '@app/shared';
import { eq } from 'drizzle-orm';
import { isUniqueViolation, type Db, type DbOrTx, type Tx } from '../../db/client';
import { accounts, personaLinks, personas } from '../../db/schema';
import { unauthorized } from '../errors';

export async function findAccountIdByEmailHash(db: DbOrTx, emailHash: string): Promise<string | null> {
  const [row] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.emailHash, emailHash));
  return row?.id ?? null;
}

export async function createAccount(
  tx: Tx,
  input: { emailHash: string; emailEncrypted: string; inviteCodeId: string; role: Role; now: Date },
): Promise<string> {
  const [account] = await tx
    .insert(accounts)
    .values({
      emailHash: input.emailHash,
      emailEncrypted: input.emailEncrypted,
      inviteCodeId: input.inviteCodeId,
      role: input.role,
      createdAt: input.now,
    })
    .returning({ id: accounts.id });
  return account!.id;
}

async function findPersonaId(db: DbOrTx, accountId: string): Promise<string | null> {
  const [link] = await db
    .select({ personaId: personaLinks.personaId })
    .from(personaLinks)
    .where(eq(personaLinks.accountId, accountId));
  return link?.personaId ?? null;
}

// Персона создаётся при первом обращении к комнатам. Вызывать только после проверки, что роль это позволяет.
export async function getOrCreatePersonaId(db: Db, accountId: string, now: Date): Promise<string> {
  const existing = await findPersonaId(db, accountId);
  if (existing) return existing;
  try {
    return await db.transaction(async (tx) => {
      const [account] = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId));
      if (!account) throw unauthorized();
      const [persona] = await tx.insert(personas).values({ createdAt: now }).returning({ id: personas.id });
      await tx.insert(personaLinks).values({ accountId, personaId: persona!.id });
      return persona!.id;
    });
  } catch (error) {
    // Два запроса одновременно создавали персону — берём ту, что уже записана
    if (!isUniqueViolation(error)) throw error;
    const raced = await findPersonaId(db, accountId);
    if (!raced) throw error;
    return raced;
  }
}

// Персона комнат не привязана к аккаунту внешним ключом, поэтому удаляется отдельно
export async function deletePersonaOfAccount(tx: Tx, accountId: string): Promise<void> {
  const personaId = await findPersonaId(tx, accountId);
  if (personaId) await tx.delete(personas).where(eq(personas.id, personaId));
}
