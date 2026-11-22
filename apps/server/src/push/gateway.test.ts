import { describe, expect, it } from 'vitest';
import { createWebPushGateway, generateVapidKeys } from './service';

// Проверяет настоящую библиотеку: тесты рассылки используют подмену и её не касаются
describe('отправка push', () => {
  it('создаёт пару ключей и шлюз с открытым ключом', () => {
    const keys = generateVapidKeys();
    expect(keys.publicKey.length).toBeGreaterThan(40);
    const gateway = createWebPushGateway({ ...keys, subject: 'mailto:admin@example.com' });
    expect(gateway.publicKey).toBe(keys.publicKey);
  });

  it('ошибку отправки не глотает', async () => {
    const gateway = createWebPushGateway({ ...generateVapidKeys(), subject: 'mailto:admin@example.com' });
    await expect(
      gateway.send({ endpoint: 'https://localhost:1/nope', p256dh: 'bad', auth: 'bad' }, { title: 't', body: 'b', url: '/' }, 60),
    ).rejects.toThrow();
  });
});
