import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { loadConfig, type Config } from './config';
import { createDb, type Db } from './db/client';
import { createInviteCode } from './invites';
import type { Mailer } from './mailer';

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

export const TEST_INVITE = 'TEST-INVITE';

export type TestContext = {
  app: FastifyInstance;
  db: Db;
  config: Config;
  mailer: CapturingMailer;
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
    ...env,
  });
  const { db, close: closeDb } = await createDb(config.database);
  await createInviteCode(db, { code: TEST_INVITE, label: 'тест', maxUses: 100 });
  const mailer = new CapturingMailer();
  const app = await buildApp({ config, db, mailer });

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
    responses,
    register,
    authed: (token) => ({ authorization: `Bearer ${token}` }),
    close: async () => {
      await app.close();
      await closeDb();
    },
  };
}
