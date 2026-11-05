import type { InterestId, TopicSummary } from '../types';
import { getCached, putCached } from '../db';
import { cachedText } from './cache';
import { limitedFetch } from './http';
import { WIKI_API, WIKI_REST, sourceFor } from './sources';

// Topic primers from the Wikipedia category API (CC BY-SA 4.0). One request
// returns up to 20 summaries with thumbnails. Bodies are cached for a week.

const TIMEOUT_MS = 10_000;
const TOPIC_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DAILY_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_EXTRACT_CHARS = 200;
const SKIP_TITLE = /^(List|Outline|Index) of\b|\b\d{4}\b/;

export interface CategoryPage {
  readonly topics: TopicSummary[];
  /** Continuation token for the next page; null on the last page. */
  readonly next: string | null;
}

export async function fetchCategoryTopics(category: string): Promise<TopicSummary[]> {
  return (await fetchCategoryPage(category, null)).topics;
}

export async function fetchCategoryPage(category: string, cont: string | null): Promise<CategoryPage> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'categorymembers',
    gcmtitle: `Category:${category}`,
    gcmtype: 'page',
    gcmlimit: '20',
    prop: 'extracts|pageimages|info',
    exintro: '1',
    explaintext: '1',
    exsentences: '4',
    piprop: 'thumbnail',
    pithumbsize: '640',
    inprop: 'url',
  });
  if (cont) params.set('gcmcontinue', cont);
  const url = `${WIKI_API}?${params.toString()}`;
  const body = await cachedText(url, TOPIC_TTL_MS, () => fetchText(url));
  return { topics: parsePages(body), next: parseContinue(body) };
}

// Rotates through an interest's categories, one request per call.
export async function topicsForInterest(interest: InterestId, round: number): Promise<TopicSummary[]> {
  const categories = sourceFor(interest)?.wikiCategories ?? [];
  const category = categories[round % Math.max(1, categories.length)];
  return category ? fetchCategoryTopics(category) : [];
}

const MAX_PAGES_PER_CALL = 3;

// Topics the reader has not seen yet. Each category keeps a cursor: once
// every topic on a page has been seen, the cursor moves to the next page, so
// the feed works deeper into a category instead of replaying its first page.
export async function freshTopicsForInterest(
  interest: InterestId,
  round: number,
  isSeen: (title: string) => boolean,
): Promise<TopicSummary[]> {
  const categories = sourceFor(interest)?.wikiCategories ?? [];
  for (let offset = 0; offset < categories.length; offset += 1) {
    const category = categories[(round + offset) % categories.length];
    if (!category) continue;
    const fresh = await freshCategoryTopics(category, isSeen);
    if (fresh.length > 0) return fresh;
  }
  return [];
}

async function freshCategoryTopics(category: string, isSeen: (title: string) => boolean): Promise<TopicSummary[]> {
  let cont = await readCursor(category);
  for (let page = 0; page < MAX_PAGES_PER_CALL; page += 1) {
    if (cont === EXHAUSTED) return [];
    const result = await fetchCategoryPage(category, cont);
    const fresh = result.topics.filter((topic) => !isSeen(topic.title));
    if (fresh.length > 0) return fresh;
    cont = result.next ?? EXHAUSTED;
    await writeCursor(category, cont);
  }
  return [];
}

const EXHAUSTED = '__exhausted__';

async function readCursor(category: string): Promise<string | null> {
  const cached = await getCached(`wiki-cursor:${category}`).catch(() => undefined);
  return cached?.body || null;
}

function writeCursor(category: string, cont: string): Promise<void> {
  return putCached(`wiki-cursor:${category}`, cont).catch(() => undefined);
}

function parseContinue(body: string): string | null {
  const next = nested(safeJson(body), 'continue', 'gcmcontinue');
  return typeof next === 'string' ? next : null;
}

export interface DailyTopic {
  readonly topic: TopicSummary;
  readonly label: string;
}

export async function fetchDailyTopic(date: Date): Promise<DailyTopic | null> {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const url = `${WIKI_REST}/feed/featured/${y}/${m}/${d}`;
  const body = await cachedText(url, DAILY_TTL_MS, () => fetchText(url));
  return parseDaily(body);
}

async function fetchText(url: string): Promise<string> {
  const res = await limitedFetch(url, { timeoutMs: TIMEOUT_MS });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  return res.text();
}

function parsePages(body: string): TopicSummary[] {
  const data = safeJson(body) as { readonly query?: { readonly pages?: unknown } } | null;
  const pages = data?.query?.pages;
  if (typeof pages !== 'object' || pages === null) return [];
  return Object.values(pages)
    .map((page) => toTopicSummary(page))
    .filter((topic): topic is TopicSummary => topic !== null);
}

// Accepts an Action API page or a REST summary object.
export function toTopicSummary(value: unknown): TopicSummary | null {
  if (typeof value !== 'object' || value === null) return null;
  const p = value as Record<string, unknown>;
  // REST summaries carry the URL form ("Nikolai_Kulikovsky"); prefer the
  // normalized display form when present.
  const normalized = nested(p.titles, 'normalized');
  const rawTitle = typeof normalized === 'string' ? normalized : typeof p.title === 'string' ? p.title : '';
  const title = rawTitle.replace(/_/g, ' ');
  const extract = typeof p.extract === 'string' ? p.extract.trim() : '';
  if (title === '' || SKIP_TITLE.test(title) || extract.length < MIN_EXTRACT_CHARS) return null;
  if (p.type === 'disambiguation') return null;
  const pageUrl = httpsUrl(p.fullurl) ?? httpsUrl(nested(p.content_urls, 'desktop', 'page'));
  if (!pageUrl) return null;
  const thumbnailUrl = httpsUrl(nested(p.thumbnail, 'source'));
  return thumbnailUrl ? { title, extract, pageUrl, thumbnailUrl } : { title, extract, pageUrl };
}

function parseDaily(body: string): DailyTopic | null {
  const data = safeJson(body) as { readonly tfa?: unknown; readonly onthisday?: unknown } | null;
  const featured = toTopicSummary(data?.tfa);
  if (featured) return { topic: featured, label: "Today's featured article" };
  const events = Array.isArray(data?.onthisday) ? data.onthisday : [];
  for (const event of events.slice(0, 10)) {
    const pages = nested(event, 'pages');
    const topic = Array.isArray(pages) ? toTopicSummary(pages[0]) : null;
    if (topic) return { topic, label: 'On this day' };
  }
  return null;
}

function nested(value: unknown, ...path: readonly string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    return new URL(value).protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

function safeJson(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    // A throttled or proxied error page is not JSON; treat it as no data.
    return null;
  }
}
