import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildApp } from './app';
import { loadConfig, type Config, type VapidConfig } from './config';
import { createDb } from './db/client';
import { createInviteCode } from './invites';
import { startBackgroundJobs } from './jobs';
import { ConsoleMailer } from './mailer';
import { createWebPushGateway, generateVapidKeys } from './push/service';
import { ensureDevLiveSlot } from './schedule/service';
import { createLiveKitGateway } from './voice/gateway';

const config = loadConfig();

if (config.env === 'production') {
  // Письма-заглушки печатают почту и код в журнал — в продакшене это недопустимо
  throw new Error('Почтовый сервис ещё не подключён: запуск в продакшене невозможен');
}

// При разработке ключи для push создаются один раз и лежат рядом с локальной базой
function loadDevVapid(current: Config): VapidConfig | null {
  if (current.vapid) return current.vapid;
  if (current.database.kind !== 'embedded' || !current.database.dataDir) return null;
  const path = join(dirname(current.database.dataDir), 'vapid.json');
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(generateVapidKeys()), { mode: 0o600 });
  }
  const keys = JSON.parse(readFileSync(path, 'utf8')) as { publicKey: string; privateKey: string };
  return { ...keys, subject: current.vapidSubject };
}

const { db } = await createDb(config.database);

if (config.devSeedInviteCode) {
  await createInviteCode(db, { code: config.devSeedInviteCode, label: 'Код для разработки', maxUses: 1000 });
}

const vapid = loadDevVapid(config);
const push = vapid ? createWebPushGateway(vapid) : null;
const mailer = new ConsoleMailer((message) => app.log.info(message));
const voice = config.voice ? createLiveKitGateway(config.voice) : null;
const app = await buildApp({ config, db, mailer, push, voice });

await startBackgroundJobs({ db, schedule: config.schedule, push, voice, onError: (error) => app.log.error(error) });
if (config.devLiveSlot) await ensureDevLiveSlot(db, new Date());

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
