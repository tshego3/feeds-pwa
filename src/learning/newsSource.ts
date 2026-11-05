import type { RssFeedModel } from '../types';
import { cacheArticles, getAllSubscriptions } from '../db';
import { fetchFeedXml, parseRssXml } from '../feed';
import { getTopFeedUrls } from '../preferences';

// Keeps For You news fresh: fetches subscriptions in rotation, top feeds
// first, so the feed draws on every subscription rather than only the feeds
// the user happened to open. A feed is refetched at most every 15 minutes.

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const FEEDS_PER_ROUND = 6;
const CONCURRENCY = 3;
const FETCHED_KEY = 'feeds-for-you-fetched-at';

export interface NewsSources {
  readonly subscriptions: readonly RssFeedModel[];
  readonly topFeedIds: ReadonlySet<number>;
}

export async function loadNewsSources(): Promise<NewsSources> {
  const subscriptions = await getAllSubscriptions();
  const topUrls = new Set(getTopFeedUrls());
  return {
    subscriptions,
    topFeedIds: new Set(subscriptions.filter((s) => topUrls.has(s.url)).map((s) => s.id)),
  };
}

// Fetches the next feeds that are due, top feeds first, then the ones
// fetched longest ago. Resolves to the number of feeds refreshed.
export async function refreshNews(sources: NewsSources, now: number): Promise<number> {
  const fetchedAt = readFetchedAt();
  const due = [...sources.subscriptions]
    .filter((feed) => now - (fetchedAt[feed.id] ?? 0) >= REFRESH_INTERVAL_MS)
    .sort((a, b) => rank(a, sources, fetchedAt) - rank(b, sources, fetchedAt))
    .slice(0, FEEDS_PER_ROUND);
  let refreshed = 0;
  for (let i = 0; i < due.length; i += CONCURRENCY) {
    const results = await Promise.all(due.slice(i, i + CONCURRENCY).map((feed) => refreshFeed(feed)));
    results.forEach((ok, j) => {
      const feed = due[i + j];
      // Failed feeds wait their turn too, so one dead feed cannot block the rotation.
      if (feed) fetchedAt[feed.id] = now;
      if (ok) refreshed += 1;
    });
  }
  writeFetchedAt(fetchedAt);
  return refreshed;
}

async function refreshFeed(feed: RssFeedModel): Promise<boolean> {
  try {
    const xml = await fetchFeedXml(feed.url);
    await cacheArticles(parseRssXml(xml, feed.id));
    return true;
  } catch {
    // Unreachable feed: skipped this round, retried after the interval.
    return false;
  }
}

function rank(feed: RssFeedModel, sources: NewsSources, fetchedAt: Readonly<Record<number, number>>): number {
  // Top feeds sort ahead of all others; within each group, oldest fetch first.
  return (sources.topFeedIds.has(feed.id) ? 0 : 1e15) + (fetchedAt[feed.id] ?? 0);
}

function readFetchedAt(): Record<number, number> {
  try {
    const value = JSON.parse(localStorage.getItem(FETCHED_KEY) ?? '{}') as unknown;
    if (typeof value !== 'object' || value === null) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
    );
  } catch {
    // Corrupt entry: every feed simply counts as due.
    return {};
  }
}

function writeFetchedAt(fetchedAt: Readonly<Record<number, number>>): void {
  try {
    localStorage.setItem(FETCHED_KEY, JSON.stringify(fetchedAt));
  } catch {
    // Storage full: the next round refetches a little early, which is harmless.
  }
}
