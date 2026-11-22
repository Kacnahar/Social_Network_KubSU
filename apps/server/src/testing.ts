import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { loadConfig, type Config } from './config';
import { createDb, type Db } from './db/client';
import { createInviteCode } from './core/invites';
import type { Mailer } from './core/mailer';
import { MemoryMediaStorage } from './core/media/storage';
import type { Role } from '@app/shared';
import type { PushGateway, PushTarget } from './core/push/service';
import type { PushMessage } from '@app/shared';
import type { VoiceGateway } from './modules/rooms/voice/gateway';

export class CapturingMailer implements Mailer {
  readonly sent: { email: string; code: string }[] = [];

  async sendLoginCode(email: string, code: string): Promise<void> {
    this.sent.push({ email, code });
  }

  lastCodeFor(email: string): string {
    const message = this.sent.findLast((item) => item.email === email);
    if (!message) throw new Error(`Письмо для ${email} не отправлялось`);
    return message.code;
  }
}

export class CapturingPush implements PushGateway {
  readonly publicKey = 'test-vapid-public-key';
  readonly sent: { endpoint: string; message: PushMessage; ttlSeconds: number }[] = [];
  readonly goneEndpoints = new Set<string>();
  readonly brokenEndpoints = new Set<string>();

  async send(target: PushTarget, message: PushMessage, ttlSeconds: number): Promise<'sent' | 'gone'> {
    if (this.brokenEndpoints.has(target.endpoint)) throw new Error('push-сервис недоступен');
    if (this.goneEndpoints.has(target.endpoint)) return 'gone';
    this.sent.push({ endpoint: target.endpoint, message, ttlSeconds });
    return 'sent';
  }
}

export class FakeVoice implements VoiceGateway {
  readonly url = 'ws://voice.test';
  readonly counts = new Map<string, number>();
  readonly closed: string[] = [];
  readonly tokens: { roomName: string; identity: string; name: string; ttlSeconds: number; canPublish?: boolean }[] = [];
  // Кто «на связи» в каждой комнате; тест задаёт это сам
  readonly present = new Map<string, Set<string>>();
  readonly publishChanges: { roomName: string; identity: string; canPublish: boolean }[] = [];
  readonly removed: { roomName: string; identity: string }[] = [];
  down = false;

  async createToken(input: { roomName: string; identity: string; name: string; ttlSeconds: number; canPublish?: boolean }): Promise<string> {
    if (this.down) throw new Error('сервер звука недоступен');
    this.tokens.push(input);
    return `voice-token-${this.tokens.length}`;
  }

  async countParticipants(roomName: string): Promise<number> {
    if (this.down) throw new Error('сервер звука недоступен');
    return this.counts.get(roomName) ?? this.present.get(roomName)?.size ?? 0;
  }

  async listIdentities(roomName: string): Promise<string[]> {
    if (this.down) throw new Error('сервер звука недоступен');
    return [...(this.present.get(roomName) ?? [])];
  }

  async setCanPublish(roomName: string, identity: string, canPublish: boolean): Promise<void> {
    if (this.down) throw new Error('сервер звука недоступен');
    this.publishChanges.push({ roomName, identity, canPublish });
  }

  async removeParticipant(roomName: string, identity: string): Promise<void> {
    if (this.down) throw new Error('сервер звука недоступен');
    this.removed.push({ roomName, identity });
    this.present.get(roomName)?.delete(identity);
  }

  async closeRoom(roomName: string): Promise<void> {
    if (this.down) throw new Error('сервер звука недоступен');
    this.closed.push(roomName);
  }
}

export const TEST_INVITE = 'TEST-INVITE';
export const TEST_INVITE_BY_ROLE: Record<Role, string> = {
  student: TEST_INVITE,
  teacher: 'TEST-TEACHER',
  guest: 'TEST-GUEST',
};

export type TestContext = {
  app: FastifyInstance;
  db: Db;
  config: Config;
  mailer: CapturingMailer;
  push: CapturingPush;
  voice: FakeVoice;
  media: MemoryMediaStorage;
  // Все адреса сервера — чтобы тесты могли пройти по каждому
  routes: { method: string; url: string }[];
  registerAs: (role: Role, email: string) => Promise<string>;
  // Тела всех ответов сервера за время теста — для проверки анонимности
  responses: { url: string; body: string }[];
  close: () => Promise<void>;
  register: (email: string, inviteCode?: string) => Promise<string>;
  authed: (token: string) => { authorization: string };
};

export async function createTestContext(env: Record<string, string> = {}): Promise<TestContext> {
  const config = loadConfig({
    NODE_ENV: 'test',
    DEV_EXPOSE_LOGIN_CODES: 'false',
    RATE_LIMIT_PER_MINUTE: '100000',
    AUTH_RATE_LIMIT_PER_MINUTE: '100000',
    SCHEDULE_WEEKDAYS: '',
    ...env,
  });
  const { db, close: closeDb } = await createDb(config.database);
  for (const [role, code] of Object.entries(TEST_INVITE_BY_ROLE)) {
    await createInviteCode(db, { code, label: `тест: ${role}`, maxUses: 100, role: role as Role });
  }
  const mailer = new CapturingMailer();
  const push = new CapturingPush();
  const voice = new FakeVoice();
  const media = new MemoryMediaStorage();
  const routes: TestContext['routes'] = [];
  const app = await buildApp({ config, db, mailer, push, voice, media, onRoute: (route) => routes.push(route) });

  const responses: TestContext['responses'] = [];
  app.addHook('onSend', async (request, _reply, payload) => {
    responses.push({ url: request.url, body: typeof payload === 'string' ? payload : '' });
    return payload;
  });

  const register = async (email: string, inviteCode: string = TEST_INVITE): Promise<string> => {
    const start = await app.inject({ method: 'POST', url: '/v1/auth/start', payload: { email, inviteCode } });
    if (start.statusCode !== 200) throw new Error(`auth/start: ${start.body}`);
    const verify = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify',
      payload: { email, code: mailer.lastCodeFor(email) },
    });
    if (verify.statusCode !== 200) throw new Error(`auth/verify: ${verify.body}`);
    return verify.json().token;
  };

  return {
    app,
    db,
    config,
    mailer,
    push,
    voice,
    media,
    routes,
    registerAs: (role, email) => register(email, TEST_INVITE_BY_ROLE[role]),
    responses,
    register,
    authed: (token) => ({ authorization: `Bearer ${token}` }),
    close: async () => {
      await app.close();
      await closeDb();
    },
  };
}
