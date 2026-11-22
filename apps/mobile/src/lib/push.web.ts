import { getPushConfig, subscribePush, unsubscribePush } from './api';

export type PushStatus = 'unsupported' | 'unavailable' | 'blocked' | 'off' | 'on';

const SW_PATH = '/sw.js';

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

async function serverKey(): Promise<string | null> {
  try {
    return (await getPushConfig()).vapidPublicKey;
  } catch {
    return null;
  }
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isSupported()) return 'unsupported';
  if ((await serverKey()) === null) return 'unavailable';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    return (await currentSubscription()) ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

export async function enablePush(token: string): Promise<PushStatus> {
  if (!isSupported()) return 'unsupported';
  const key = await serverKey();
  if (key === null) return 'unavailable';

  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'blocked';
  if (permission !== 'granted') return 'off';

  await navigator.serviceWorker.register(SW_PATH);
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }));

  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) {
    await subscription.unsubscribe();
    throw new Error('Браузер не смог создать подписку. Попробуйте ещё раз');
  }
  try {
    await subscribePush(token, { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
  } catch (error) {
    // Без записи на сервере подписка бесполезна: не оставляем «включено» только в браузере
    await subscription.unsubscribe().catch(() => undefined);
    throw error;
  }
  return 'on';
}

export async function disablePush(token: string | null): Promise<void> {
  if (!isSupported()) return;
  let subscription: PushSubscription | null = null;
  try {
    subscription = await currentSubscription();
  } catch {
    return;
  }
  if (!subscription) return;
  const { endpoint } = subscription;
  await subscription.unsubscribe().catch(() => undefined);
  if (token) await unsubscribePush(token, endpoint).catch(() => undefined);
}
