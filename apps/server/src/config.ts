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
});

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
  }

  const emailEncryptionKey = Buffer.from(parsed.EMAIL_ENCRYPTION_KEY ?? DEV_EMAIL_ENCRYPTION_KEY, 'base64');
  if (emailEncryptionKey.length !== 32) {
    throw new Error('EMAIL_ENCRYPTION_KEY должен быть 32 байта в base64');
  }

  let database: DbOptions;
  if (parsed.DATABASE_URL) database = { kind: 'postgres', url: parsed.DATABASE_URL };
  else if (parsed.NODE_ENV === 'test') database = { kind: 'embedded' };
  else database = { kind: 'embedded', dataDir: parsed.EMBEDDED_DB_DIR };

  return {
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
