import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

// Остальные тесты собирают сервер из частей. Этот запускает его так же, как при разработке:
// с базой на диске, настоящей библиотекой push и фоновыми задачами.

const serverDir = fileURLToPath(new URL('..', import.meta.url));

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('нет порта'))));
    });
  });
}

describe('настоящий запуск сервера', () => {
  const root = mkdtempSync(join(tmpdir(), 'rooms-boot-'));
  let child: ChildProcess | undefined;

  afterAll(() => {
    child?.kill('SIGKILL');
    rmSync(root, { recursive: true, force: true });
  });

  it('стартует с чистой папки, отвечает и создаёт расписание и ключи для push', async () => {
    const port = await freePort();
    let output = '';
    child = spawn(join(serverDir, '../../node_modules/.bin/tsx'), ['src/main.ts'], {
      cwd: serverDir,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'development',
        HOST: '127.0.0.1',
        PORT: String(port),
        EMBEDDED_DB_DIR: join(root, 'data', 'pglite'),
      },
    });
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
    let exited = false;
    child.once('exit', () => (exited = true));

    const base = `http://127.0.0.1:${port}/v1`;
    const deadline = Date.now() + 40_000;
    let healthy = false;
    while (!healthy && !exited && Date.now() < deadline) {
      healthy = await fetch(`${base}/health`).then((response) => response.ok, () => false);
      if (!healthy) await new Promise((resolve) => setTimeout(resolve, 300));
    }
    expect(healthy, `сервер не запустился:\n${output}`).toBe(true);

    const push = (await (await fetch(`${base}/push/config`)).json()) as { vapidPublicKey: string | null };
    expect(push.vapidPublicKey).toBeTruthy();

    const start = await fetch(`${base}/auth/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'boot@example.com', inviteCode: 'TEST-2026' }),
    });
    const { devCode } = (await start.json()) as { devCode: string };
    const verify = await fetch(`${base}/auth/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'boot@example.com', code: devCode }),
    });
    const { token } = (await verify.json()) as { token: string };
    const slots = (await (await fetch(`${base}/slots`, { headers: { authorization: `Bearer ${token}` } })).json()) as {
      slots: unknown[];
    };
    expect(slots.slots.length).toBeGreaterThan(0);
  }, 60_000);
});
