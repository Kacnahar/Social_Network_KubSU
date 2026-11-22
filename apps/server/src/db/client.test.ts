import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInviteCode } from '../invites';
import { createDb } from './client';
import { inviteCodes } from './schema';

describe('локальная база на диске', () => {
  it('сама создаёт папку при первом запуске и сохраняет данные между запусками', async () => {
    const root = mkdtempSync(join(tmpdir(), 'rooms-db-'));
    const dataDir = join(root, 'ещё', 'не', 'создана');
    try {
      const first = await createDb({ kind: 'embedded', dataDir });
      await createInviteCode(first.db, { code: 'KEEP', label: 'тест', maxUses: 1 });
      await first.close();

      const second = await createDb({ kind: 'embedded', dataDir });
      const rows = await second.db.select().from(inviteCodes);
      await second.close();
      expect(rows.map((row) => row.code)).toEqual(['KEEP']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
