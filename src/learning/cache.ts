import { getCached, putCached, pruneCache } from '../db';

// TTL cache for API bodies in IndexedDB. A failed refresh falls back to the
// stale copy, so the feed keeps working offline.

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function cachedText(url: string, ttlMs: number, fetcher: () => Promise<string>): Promise<string> {
  const cached = await getCached(url).catch(() => undefined);
  if (cached && Date.now() - cached.fetchedAt < ttlMs) return cached.body;
  try {
    const body = await fetcher();
    await putCached(url, body).catch(() => {
      // Storage full or blocked: the fresh body is still usable this time.
    });
    return body;
  } catch (err) {
    if (cached) return cached.body;
    throw err;
  }
}

export function pruneCatalogCache(): Promise<void> {
  return pruneCache(Date.now() - MAX_AGE_MS);
}
