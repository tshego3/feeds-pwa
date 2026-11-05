import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

// Fresh module per test: host state lives in the module.
async function loadHttp() {
  vi.resetModules();
  return import('./http');
}

const TRIVIA = 'https://opentdb.com/api.php?amount=1';
const WIKI = 'https://en.wikipedia.org/w/api.php?action=query';

describe('limitedFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts two trivia requests at least 5,000 ms apart', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { limitedFetch } = await loadHttp();
    const first = limitedFetch(TRIVIA, { timeoutMs: 10_000 });
    const second = limitedFetch(TRIVIA, { timeoutMs: 10_000 });
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('holds a fifth Wikipedia request until one of four finishes', async () => {
    const pending: Array<(r: Response) => void> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve)));
    vi.stubGlobal('fetch', fetchMock);
    const { limitedFetch } = await loadHttp();
    const calls = Array.from({ length: 5 }, () => limitedFetch(WIKI, { timeoutMs: 10_000 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    pending[0]?.(new Response('{}'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    pending.slice(1).forEach((resolve) => resolve(new Response('{}')));
    await Promise.all(calls);
  });

  it('blocks a host for 60 s after HTTP 429', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    const { limitedFetch } = await loadHttp();
    await expect(limitedFetch(WIKI, { timeoutMs: 10_000 })).rejects.toMatchObject({ type: 'network' });
    await expect(limitedFetch(WIKI, { timeoutMs: 10_000 })).rejects.toMatchObject({ type: 'network' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    await expect(limitedFetch(WIKI, { timeoutMs: 10_000 })).rejects.toMatchObject({ type: 'network' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
