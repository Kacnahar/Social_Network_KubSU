import { z } from 'zod';
import type { DbOptions } from './db/client';

// Ключи только для разработки и тестов. В продакшене обязательны свои.
const DEV_EMAIL_HASH_KEY = 'dev-only-email-hash-key';
const DEV_EMAIL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

const flag = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
  DATABASE_URL: z.string().optional(),
  EMBEDDED_DB_DIR: z.string().default('.data/pglite'),
  EMAIL_HASH_KEY: z.string().min(16).optional(),
  EMAIL_ENCRYPTION_KEY: z.string().optional(),
  DEV_EXPOSE_LOGIN_CODES: flag.optional(),
  DEV_SEED_INVITE_CODE: z.string().optional(),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
  // Расписание по умолчанию: дни недели (1 — понедельник … 7 — воскресенье), пусто — не создавать
  SCHEDULE_WEEKDAYS: z.string().default('1,3,5'),
  SCHEDULE_TIME: z.string().regex(/^\d{1,2}:\d{2}$/).default('20:00'),
  SCHEDULE_UTC_OFFSET_HOURS: z.coerce.number().int().min(-12).max(14).default(3),
  SCHEDULE_DURATION_MINUTES: z.coerce.number().int().positive().default(45),
  SCHEDULE_TITLE: z.string().default('Вечерняя комната'),
  SCHEDULE_DAYS_AHEAD: z.coerce.number().int().positive().max(60).default(14),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@example.com'),
  // Сервер звука LiveKit: адрес для приложений (ws/wss) и ключи
  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  DEV_LIVE_SLOT: flag.optional(),
});

// url — адрес для приложений; apiUrl — адрес, по которому к серверу звука ходит наш сервер
export type VoiceConfig = { url: string; apiUrl: string; apiKey: string; apiSecret: string };

export type ScheduleConfig = {
  weekdays: number[];
  hour: number;
  minute: number;
  utcOffsetHours: number;
  durationMinutes: number;
  title: string;
  daysAhead: number;
};

export type VapidConfig = { publicKey: string; privateKey: string; subject: string };

export type Config = {
  env: 'development' | 'test' | 'production';
  host: string;
  port: number;
  corsOrigins: string[];
  database: DbOptions;
  emailHashKey: string;
  emailEncryptionKey: Buffer;
  // Возвращать код входа прямо в ответе — пока не подключена отправка писем
  devExposeLoginCodes: boolean;
  devSeedInviteCode: string | null;
  rateLimitPerMinute: number;
  authRateLimitPerMinute: number;
  schedule: ScheduleConfig;
  // null — ключи не заданы: в разработке создаются автоматически, в продакшене напоминания выключены
  vapid: VapidConfig | null;
  vapidSubject: string;
  // null — сервер звука не настроен, вход в комнаты выключен
  voice: VoiceConfig | null;
  // При разработке всегда держать одну открытую «Тестовую комнату»
  devLiveSlot: boolean;
};

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = envSchema.parse(env);
  const isProduction = parsed.NODE_ENV === 'production';

  if (isProduction) {
    if (!parsed.DATABASE_URL) throw new Error('В продакшене нужен DATABASE_URL');
    if (!parsed.EMAIL_HASH_KEY || !parsed.EMAIL_ENCRYPTION_KEY) {
      throw new Error('В продакшене нужны EMAIL_HASH_KEY и EMAIL_ENCRYPTION_KEY');
    }
    if (parsed.DEV_EXPOSE_LOGIN_CODES) {
      throw new Error('DEV_EXPOSE_LOGIN_CODES нельзя включать в продакшене');
    }
    if (parsed.DEV_SEED_INVITE_CODE) {
      throw new Error('DEV_SEED_INVITE_CODE нельзя задавать в продакшене');
    }
    if (parsed.DEV_LIVE_SLOT) throw new Error('DEV_LIVE_SLOT нельзя включать в продакшене');
    if (parsed.LIVEKIT_API_KEY === 'devkey') throw new Error('В продакшене нужны свои ключи LiveKit');
  }

  const emailEncryptionKey = Buffer.from(parsed.EMAIL_ENCRYPTION_KEY ?? DEV_EMAIL_ENCRYPTION_KEY, 'base64');
  if (emailEncryptionKey.length !== 32) {
    throw new Error('EMAIL_ENCRYPTION_KEY должен быть 32 байта в base64');
  }

  let database: DbOptions;
  if (parsed.DATABASE_URL) database = { kind: 'postgres', url: parsed.DATABASE_URL };
  else if (parsed.NODE_ENV === 'test') database = { kind: 'embedded' };
  else database = { kind: 'embedded', dataDir: parsed.EMBEDDED_DB_DIR };

  const [hour = 20, minute = 0] = parsed.SCHEDULE_TIME.split(':').map(Number);
  const weekdays = parsed.SCHEDULE_WEEKDAYS.split(',')
    .map((day) => Number(day.trim()))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);

  // При разработке — локальный LiveKit в режиме --dev с его стандартными ключами.
  // Внутренний адрес — цифрами: имя localhost на некоторых машинах из Node не находится
  const voiceUrl = parsed.LIVEKIT_URL ?? 'ws://localhost:7880';
  const voiceApiUrl =
    parsed.LIVEKIT_API_URL ?? voiceUrl.replace(/^ws/, 'http').replace('//localhost', '//127.0.0.1');
  const voice: VoiceConfig | null =
    parsed.LIVEKIT_URL && parsed.LIVEKIT_API_KEY && parsed.LIVEKIT_API_SECRET
      ? { url: voiceUrl, apiUrl: voiceApiUrl, apiKey: parsed.LIVEKIT_API_KEY, apiSecret: parsed.LIVEKIT_API_SECRET }
      : parsed.NODE_ENV === 'development'
        ? { url: voiceUrl, apiUrl: voiceApiUrl, apiKey: 'devkey', apiSecret: 'secret' }
        : null;

  return {
    voice,
    devLiveSlot: parsed.DEV_LIVE_SLOT ?? parsed.NODE_ENV === 'development',
    schedule: {
      weekdays,
      hour,
      minute,
      utcOffsetHours: parsed.SCHEDULE_UTC_OFFSET_HOURS,
      durationMinutes: parsed.SCHEDULE_DURATION_MINUTES,
      title: parsed.SCHEDULE_TITLE,
      daysAhead: parsed.SCHEDULE_DAYS_AHEAD,
    },
    vapid:
      parsed.VAPID_PUBLIC_KEY && parsed.VAPID_PRIVATE_KEY
        ? { publicKey: parsed.VAPID_PUBLIC_KEY, privateKey: parsed.VAPID_PRIVATE_KEY, subject: parsed.VAPID_SUBJECT }
        : null,
    vapidSubject: parsed.VAPID_SUBJECT,
    env: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    corsOrigins: parsed.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    database,
    emailHashKey: parsed.EMAIL_HASH_KEY ?? DEV_EMAIL_HASH_KEY,
    emailEncryptionKey,
    devExposeLoginCodes: parsed.DEV_EXPOSE_LOGIN_CODES ?? !isProduction,
    devSeedInviteCode: isProduction ? null : (parsed.DEV_SEED_INVITE_CODE ?? 'TEST-2026'),
    rateLimitPerMinute: parsed.RATE_LIMIT_PER_MINUTE,
    authRateLimitPerMinute: parsed.AUTH_RATE_LIMIT_PER_MINUTE,
  };
}
