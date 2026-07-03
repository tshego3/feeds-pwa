const AUTO_REFRESH_KEY = 'feeds-auto-refresh-enabled';
const SHOW_IMAGES_KEY = 'feeds-show-images';
const LAST_FEED_KEY = 'feeds-last-feed-id';

export function getBoolPref(key: string, defaultValue: boolean): boolean {
  const stored = localStorage.getItem(key);
  return stored === null ? defaultValue : stored === 'true';
}

export function setBoolPref(key: string, value: boolean): void {
  localStorage.setItem(key, value ? 'true' : 'false');
}

export function getAutoRefreshPreference(): boolean {
  return getBoolPref(AUTO_REFRESH_KEY, true);
}

export function setAutoRefreshPreference(enabled: boolean): void {
  setBoolPref(AUTO_REFRESH_KEY, enabled);
}

export function getShowImagesPreference(): boolean {
  return getBoolPref(SHOW_IMAGES_KEY, true);
}

export function setShowImagesPreference(enabled: boolean): void {
  setBoolPref(SHOW_IMAGES_KEY, enabled);
}

export function getLastFeedId(): number | null {
  const stored = localStorage.getItem(LAST_FEED_KEY);
  if (stored === null) return null;
  const id = Number(stored);
  return Number.isInteger(id) ? id : null;
}

export function setLastFeedId(id: number): void {
  localStorage.setItem(LAST_FEED_KEY, String(id));
}
