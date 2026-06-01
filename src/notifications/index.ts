const PERMISSION_KEY = 'feeds-notifications-enabled';

export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPreference(): boolean {
  return localStorage.getItem(PERMISSION_KEY) === 'true';
}

export function setNotificationPreference(enabled: boolean): void {
  localStorage.setItem(PERMISSION_KEY, enabled ? 'true' : 'false');
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function showNewArticlesNotification(
  feedTitle: string,
  count: number,
): Promise<void> {
  if (!isNotificationSupported()) return;
  if (!getNotificationPreference()) return;
  if (Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('feeds', {
    body: `${count} new article${count !== 1 ? 's' : ''} in ${feedTitle}`,
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    tag: `new-articles-${feedTitle}`,
  });
}
