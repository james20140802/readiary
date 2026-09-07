/* global self */
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    /* always show a generic visible notification */
  }
  // Fixed same-origin destination. Never navigate to a URL supplied by a push payload.
  event.waitUntil(
    self.registration.showNotification('Readiary', {
      body:
        typeof message.body === 'string' ? message.body.slice(0, 160) : '돌아볼 독서 소식이 있어요',
      icon: '/icons/icon-192x192-v2.png',
      tag: 'readiary-reading',
      data: { url: '/protected/notifications/inbox' },
    })
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(new URL('/protected/notifications/inbox', self.location.origin).href)
  );
});
