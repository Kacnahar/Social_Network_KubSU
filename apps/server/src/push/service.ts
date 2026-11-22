import type { PushMessage, PushSubscribeRequest } from '@rooms/shared';
import { and, eq } from 'drizzle-orm';
import { generateVAPIDKeys, sendNotification } from 'web-push';
import type { VapidConfig } from '../config';
import type { Db } from '../db/client';
import { pushSubscriptions } from '../db/schema';
import { ApiError } from '../errors';

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export interface PushGateway {
  readonly publicKey: string;
  // gone — подписка больше не существует, её нужно удалить
  send(target: PushTarget, message: PushMessage, ttlSeconds: number): Promise<'sent' | 'gone'>;
}

// Сервер сам обращается по адресу из подписки, поэтому принимаем только известные push-сервисы браузеров
const ALLOWED_PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return (
      url.protocol === 'https:' &&
      url.port === '' &&
      url.username === '' &&
      ALLOWED_PUSH_HOSTS.some((pattern) => pattern.test(url.hostname))
    );
  } catch {
    return false;
  }
}

export async function saveSubscription(db: Db, accountId: string, input: PushSubscribeRequest): Promise<void> {
  if (!isAllowedPushEndpoint(input.endpoint)) {
    throw new ApiError(400, 'validation_error', 'Этот браузер не поддерживается для напоминаний');
  }
  const row = {
    accountId,
    kind: 'webpush' as const,
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    createdAt: new Date(),
  };
  // Один браузер — одна подписка: если в нём вошли под другим аккаунтом, подписка переезжает к нему
  await db.insert(pushSubscriptions).values(row).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: row });
}

export async function removeSubscription(db: Db, accountId: string, endpoint: string): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.accountId, accountId), eq(pushSubscriptions.endpoint, endpoint)));
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return generateVAPIDKeys();
}

export function createWebPushGateway(vapid: VapidConfig): PushGateway {
  return {
    publicKey: vapid.publicKey,
    async send(target, message, ttlSeconds) {
      try {
        await sendNotification(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          JSON.stringify(message),
          { vapidDetails: vapid, TTL: Math.max(0, Math.round(ttlSeconds)), timeout: 10_000 },
        );
        return 'sent';
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) return 'gone';
        throw error;
      }
    },
  };
}
