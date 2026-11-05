import type { LessonError } from '../types';
import { BOOK_PURPOSE, buildProxyUrl, fetchWithTimeout } from '../feed/proxy';
import { mirrorTextUrls } from './sources';

// Book text from Gutenberg mirrors, never from www.gutenberg.org, whose
// website is for human users only. Mirrors send no CORS headers, so the text
// goes through the proxy. The service worker caches it for 60 days.

const TEXT_TIMEOUT_MS = 30_000;
const MAX_BOOK_CHARS = 1_500_000;
const START_MARKER = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i;

export async function fetchBookText(gutenbergId: number): Promise<string> {
  for (const url of mirrorTextUrls(gutenbergId)) {
    const text = await tryMirror(url);
    if (text !== null) return text;
  }
  const error: LessonError = { type: 'network', message: 'Could not download this book. Try again later.' };
  throw error;
}

async function tryMirror(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(buildProxyUrl(url, BOOK_PURPOSE), TEXT_TIMEOUT_MS);
    if (!res.ok) return null;
    const text = await res.text();
    return text.length <= MAX_BOOK_CHARS && START_MARKER.test(text) ? text : null;
  } catch {
    // Timeout or network failure: the next mirror may still answer.
    return null;
  }
}
