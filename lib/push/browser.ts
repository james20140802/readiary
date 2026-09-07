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
    // Browser unsubscribe works even when the login session has already ended.
    const endpoint = subscription.endpoint;
    // Try both paths: a failed browser request must not leave the server subscription active.
    const [serverRemoved, browserRemoved] = await Promise.all([
      apiFetch('/api/push/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })
        .then((response) => response.ok)
        .catch(() => false),
      subscription.unsubscribe().catch(() => false),
    ]);
    if (!serverRemoved && !browserRemoved)
      throw new Error('기기 알림을 해제하지 못했습니다. 다시 시도해 주세요.');
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
export async function enableDevicePush(publicKey: string, userId: string) {
  // Called only from a click, after Notification.requestPermission has resolved.
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('앱 설치를 마친 뒤 다시 시도해 주세요.')), 10000)
    ),
  ]);
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
