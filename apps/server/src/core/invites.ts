import { normalizeInviteCode, type Role } from '@app/shared';
import type { Db } from '../db/client';
import { inviteCodes } from '../db/schema';

export async function createInviteCode(
  db: Db,
  input: { code: string; label: string; maxUses: number; role?: Role; expiresAt?: Date },
): Promise<void> {
  await db
    .insert(inviteCodes)
    .values({
      code: normalizeInviteCode(input.code),
      label: input.label,
      maxUses: input.maxUses,
      role: input.role ?? 'student',
      expiresAt: input.expiresAt ?? null,
      createdAt: new Date(),
    })
    .onConflictDoNothing({ target: inviteCodes.code });
}
