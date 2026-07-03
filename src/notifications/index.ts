import { getBoolPref, setBoolPref } from '../preferences';

const PERMISSION_KEY = 'feeds-notifications-enabled';

export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPreference(): boolean {
  // Default on: the app asks for permission on first launch and starts
  // notifying as soon as the user grants it.
  return getBoolPref(PERMISSION_KEY, true);
}

export function setNotificationPreference(enabled: boolean): void {
  setBoolPref(PERMISSION_KEY, enabled);
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
