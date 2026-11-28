import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildApp } from './app';
import { loadConfig, type Config, type VapidConfig } from './config';
import { startMaintenance } from './maintenance';
import { createDb } from './db/client';
import { createInviteCode } from './core/invites';
import { startBackgroundJobs } from './modules/rooms/jobs';
import { createGifsRuProvider } from './core/gifs/gifsru';
import { ConsoleMailer } from './core/mailer';
import { DiskMediaStorage, MemoryMediaStorage } from './core/media/storage';
import { createWebPushGateway, generateVapidKeys } from './core/push/service';
import { ensureDevLiveSlot } from './modules/rooms/schedule/service';
import { createLiveKitGateway } from './modules/rooms/voice/gateway';

// Секреты (например, GIFS_RU_API_KEY) читаются из файла apps/server/.env, если он есть; в git он не попадает
if (existsSync('.env')) process.loadEnvFile('.env');

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
  await createInviteCode(db, { code: config.devSeedInviteCode, label: 'Разработка: студент', maxUses: 1000, role: 'student' });
  await createInviteCode(db, { code: 'TEACHER-2026', label: 'Разработка: преподаватель', maxUses: 1000, role: 'teacher' });
  await createInviteCode(db, { code: 'GUEST-2026', label: 'Разработка: гость', maxUses: 1000, role: 'guest' });
}

const vapid = loadDevVapid(config);
const push = vapid ? createWebPushGateway(vapid) : null;
const mailer = new ConsoleMailer((message) => app.log.info(message));
const voice = config.voice ? createLiveKitGateway(config.voice) : null;
const media = config.mediaDir ? new DiskMediaStorage(config.mediaDir) : new MemoryMediaStorage();
const gifs = config.gifsRuApiKey ? createGifsRuProvider(config.gifsRuApiKey) : null;
const app = await buildApp({ config, db, mailer, push, voice, media, gifs });
if (!gifs) app.log.warn('GIFS_RU_API_KEY не задан: окно GIF будет отвечать «недоступно»');

await startBackgroundJobs({ db, schedule: config.schedule, push, voice, onError: (error) => app.log.error(error) });
if (config.devLiveSlot) await ensureDevLiveSlot(db, new Date());
startMaintenance({ db, media }, (error) => app.log.error(error));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
