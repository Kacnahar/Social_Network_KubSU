import { buildApp } from './app';
import { loadConfig } from './config';
import { createDb } from './db/client';
import { createInviteCode } from './invites';
import { ConsoleMailer } from './mailer';

const config = loadConfig();

if (config.env === 'production') {
  // Письма-заглушки печатают почту и код в журнал — в продакшене это недопустимо
  throw new Error('Почтовый сервис ещё не подключён: запуск в продакшене невозможен');
}

const { db } = await createDb(config.database);

if (config.devSeedInviteCode) {
  await createInviteCode(db, { code: config.devSeedInviteCode, label: 'Код для разработки', maxUses: 1000 });
}

const mailer = new ConsoleMailer((message) => app.log.info(message));
const app = await buildApp({ config, db, mailer });

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
