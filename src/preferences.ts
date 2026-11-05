import type { InterestId, SpeechRate } from './types';
import { isInterestId } from './learning/sources';

const AUTO_REFRESH_KEY = 'feeds-auto-refresh-enabled';
const SHOW_IMAGES_KEY = 'feeds-show-images';
const LAST_FEED_KEY = 'feeds-last-feed-id';
const SPEECH_RATE_KEY = 'feeds-speech-rate';
const SPEECH_VOICE_KEY = 'feeds-speech-voice';

export const SPEECH_RATES: readonly SpeechRate[] = [0.75, 1, 1.25, 1.5];

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

function isSpeechRate(value: number): value is SpeechRate {
  return SPEECH_RATES.some((rate) => rate === value);
}

export function getSpeechRatePreference(): SpeechRate {
  const stored = Number(localStorage.getItem(SPEECH_RATE_KEY));
  return isSpeechRate(stored) ? stored : 1;
}

export function setSpeechRatePreference(rate: SpeechRate): void {
  localStorage.setItem(SPEECH_RATE_KEY, String(rate));
}

export function getSpeechVoicePreference(): string | null {
  return localStorage.getItem(SPEECH_VOICE_KEY);
}

export function setSpeechVoicePreference(voiceUri: string): void {
  localStorage.setItem(SPEECH_VOICE_KEY, voiceUri);
}

// Learning feed

const INTERESTS_KEY = 'feeds-interests';
const DAILY_GOAL_KEY = 'feeds-daily-goal';
const MUTED_INTERESTS_KEY = 'feeds-muted-interests';

export const DAILY_GOALS: readonly number[] = [5, 10, 20];
const DEFAULT_DAILY_GOAL = 10;

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    // Corrupt or unavailable storage: callers fall back to their defaults.
    return null;
  }
}

export function getInterests(): InterestId[] {
  const value = readJson(INTERESTS_KEY);
  return Array.isArray(value) ? value.filter(isInterestId) : [];
}

export function setInterests(ids: readonly InterestId[]): void {
  localStorage.setItem(INTERESTS_KEY, JSON.stringify([...new Set(ids)]));
}

export function getDailyGoal(): number {
  const stored = Number(localStorage.getItem(DAILY_GOAL_KEY));
  return DAILY_GOALS.includes(stored) ? stored : DEFAULT_DAILY_GOAL;
}

export function setDailyGoal(goal: number): void {
  if (DAILY_GOALS.includes(goal)) localStorage.setItem(DAILY_GOAL_KEY, String(goal));
}

function readMutes(): Partial<Record<InterestId, number>> {
  const value = readJson(MUTED_INTERESTS_KEY);
  if (typeof value !== 'object' || value === null) return {};
  const mutes: Partial<Record<InterestId, number>> = {};
  for (const [id, until] of Object.entries(value)) {
    if (isInterestId(id) && typeof until === 'number') mutes[id] = until;
  }
  return mutes;
}

// Interests muted with "Not interested" whose mute has not yet expired.
export function getMutedInterests(now: number): InterestId[] {
  return Object.entries(readMutes())
    .filter(([, until]) => typeof until === 'number' && until > now)
    .map(([id]) => id)
    .filter(isInterestId);
}

export function muteInterest(id: InterestId, until: number): void {
  localStorage.setItem(MUTED_INTERESTS_KEY, JSON.stringify({ ...readMutes(), [id]: until }));
}

// For You news sources. Top feeds get double the slots in the feed and are
// refreshed first; every other subscription still rotates in. Stored as feed
// URLs so they survive subscription ids changing on re-import.
const TOP_FEEDS_KEY = 'feeds-top-feed-urls';

export const DEFAULT_TOP_FEED_URLS: readonly string[] = [
  'https://topauto.co.za/news/feed/',
  'https://www.carmag.co.za/news/feed/',
  'https://mybroadband.co.za/news/feed',
  'https://techcrunch.com/feed/',
  'https://dailyinvestor.com/feed/',
  'https://businesstech.co.za/news/rss',
];

export function getTopFeedUrls(): string[] {
  const value = readJson(TOP_FEEDS_KEY);
  if (!Array.isArray(value)) return [...DEFAULT_TOP_FEED_URLS];
  return value.filter((url): url is string => typeof url === 'string');
}

export function setTopFeedUrls(urls: readonly string[]): void {
  localStorage.setItem(TOP_FEEDS_KEY, JSON.stringify([...new Set(urls)]));
}
