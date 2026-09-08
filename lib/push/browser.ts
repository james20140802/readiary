import { DEFAULT_PUSH_PREFERENCES } from './types';
import { apiFetch } from '@/lib/api/fetch';
export const PUSH_OWNER_KEY = 'readiary:push-owner';
export async function existingPush() {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.pushManager ? await registration.pushManager.getSubscription() : null;
}
export async function disableDevicePush() {
  const subscription = await existingPush();
  if (subscription) {
    // Keep the browser endpoint available for retry until the server confirms deletion.
    const response = await apiFetch('/api/push/subscription', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    if (!response.ok) throw new Error('기기 알림을 해제하지 못했습니다. 다시 시도해 주세요.');
    // Once server delivery is revoked, browser cleanup may safely be best-effort.
    await subscription.unsubscribe().catch(() => false);
  }
  try {
    localStorage.removeItem(PUSH_OWNER_KEY);
  } catch {
    /* blocked storage */
  }
  const registration = await navigator.serviceWorker?.getRegistration();
  const notifications = await registration?.getNotifications?.();
  notifications?.forEach((n) => n.close());
}
// Explicit registration also covers App Router pages, where next-pwa's legacy
// main.js registration entry is not loaded. Registering the same scope is idempotent.
export async function readyPushWorker() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        return await navigator.serviceWorker.ready;
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('알림 연결 준비가 지연되고 있어요. 잠시 후 다시 시도해 주세요.')),
          10000
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function enableDevicePush(publicKey: string, userId: string) {
  // Called only from a click, after Notification.requestPermission has resolved.
  const registration = await readyPushWorker();
  let subscription = await registration.pushManager.getSubscription();
  if (localStorage.getItem(PUSH_OWNER_KEY) !== userId && subscription) {
    await subscription.unsubscribe();
    subscription = null;
  }
  const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
    c.charCodeAt(0)
  );
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  const response = await apiFetch('/api/push/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) {
    await subscription.unsubscribe();
    throw new Error('이 기기를 등록하지 못했습니다. 다시 시도해 주세요.');
  }
  localStorage.setItem(PUSH_OWNER_KEY, userId);
}

// Revoke account-wide delivery before password changes end authenticated sessions.
export async function disableAccountPush() {
  const response = await apiFetch('/api/push/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DEFAULT_PUSH_PREFERENCES),
  });
  if (!response.ok) throw new Error('계정 알림을 해제하지 못했습니다. 다시 시도해 주세요.');
}
