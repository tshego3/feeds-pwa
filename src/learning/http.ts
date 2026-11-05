import type { LessonError } from '../types';
import { fetchWithTimeout } from '../feed/proxy';
import { API_USER_AGENT } from './sources';

// Per-host request limits for the learning APIs (plan Section 8.6).
// Wikipedia handled 15 parallel browser requests without throttling, so it
// gets a concurrency cap only. Open Trivia DB allows 1 request per 5 s per IP.
// A 429 blocks the host for a minute; callers then fall back to cached data.

interface HostLimit {
  readonly maxConcurrent: number;
  readonly minIntervalMs: number;
}

interface HostState {
  active: number;
  lastStart: number;
  blockedUntil: number;
  timer: ReturnType<typeof setTimeout> | 0;
  readonly queue: Array<() => void>;
}

const HOST_LIMITS: Readonly<Record<string, HostLimit>> = {
  'en.wikipedia.org': { maxConcurrent: 4, minIntervalMs: 0 },
  'opentdb.com': { maxConcurrent: 1, minIntervalMs: 5_000 },
};

const WIKIMEDIA_HOSTS: ReadonlySet<string> = new Set(['en.wikipedia.org']);
const BLOCK_MS = 60_000;

const hosts = new Map<string, HostState>();

export interface LimitedFetchOptions {
  readonly timeoutMs: number;
}

export async function limitedFetch(url: string, options: LimitedFetchOptions): Promise<Response> {
  const host = new URL(url).host;
  if (Date.now() < stateFor(host).blockedUntil) throw networkError();
  const limit = HOST_LIMITS[host];
  if (!limit) return fetchOnce(url, host, options.timeoutMs);

  await acquire(host, limit);
  try {
    return await fetchOnce(url, host, options.timeoutMs);
  } finally {
    release(host, limit);
  }
}

// Also used when an API reports a rate limit in its body (Open Trivia DB).
export function blockHost(host: string): void {
  stateFor(host).blockedUntil = Date.now() + BLOCK_MS;
}

async function fetchOnce(url: string, host: string, timeoutMs: number): Promise<Response> {
  const headers: Record<string, string> = WIKIMEDIA_HOSTS.has(host) ? { 'Api-User-Agent': API_USER_AGENT } : {};
  let res: Response;
  try {
    res = await fetchWithTimeout(url, timeoutMs, { headers });
  } catch {
    throw networkError();
  }
  if (res.status === 429) {
    blockHost(host);
    throw networkError();
  }
  return res;
}

function stateFor(host: string): HostState {
  const existing = hosts.get(host);
  if (existing) return existing;
  const created: HostState = { active: 0, lastStart: 0, blockedUntil: 0, timer: 0, queue: [] };
  hosts.set(host, created);
  return created;
}

function acquire(host: string, limit: HostLimit): Promise<void> {
  return new Promise((resolve) => {
    stateFor(host).queue.push(resolve);
    pump(host, limit);
  });
}

function release(host: string, limit: HostLimit): void {
  stateFor(host).active -= 1;
  pump(host, limit);
}

// Starts queued requests while the host has free slots. The loop is bounded
// by the queue length; an interval wait parks it on a single timer.
function pump(host: string, limit: HostLimit): void {
  const state = stateFor(host);
  if (state.timer) return;
  while (state.queue.length > 0 && state.active < limit.maxConcurrent) {
    const wait = state.lastStart + limit.minIntervalMs - Date.now();
    if (wait > 0) {
      state.timer = setTimeout(() => {
        state.timer = 0;
        pump(host, limit);
      }, wait);
      return;
    }
    state.active += 1;
    state.lastStart = Date.now();
    state.queue.shift()?.();
  }
}

function networkError(): LessonError {
  return { type: 'network', message: 'Network error. Please check your connection.' };
}
