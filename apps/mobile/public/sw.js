// Service worker для напоминаний. Ничего не кэширует и не перехватывает запросы.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = {};
  }
  const title = typeof message.title === 'string' && message.title ? message.title : 'Комнаты';
  const body = typeof message.body === 'string' ? message.body : 'Скоро начнётся комната';
  const url = typeof message.url === 'string' ? message.url : '/';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
      icon: '/favicon.png',
      badge: '/favicon.png',
    }),
  );
});

// Только пути внутри нашего сайта: всё остальное ведёт на главную
const safeUrl = (url) => (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : '/');

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await existing.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
