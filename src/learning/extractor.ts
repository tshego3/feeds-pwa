import { fetchArticleHtml } from '../feed';
import { LESSON_PURPOSE } from '../feed/proxy';
import { normalizeWhitespace } from './text';

// Turns an article page into plain-text paragraphs with Mozilla Readability
// (the Firefox Reader View engine). Nothing parsed here ever reaches the live
// page: DOMParser builds inert documents, and only textContent leaves.

const MAX_HTML_CHARS = 2_000_000;
const LESSON_FETCH_TIMEOUT_MS = 15_000;
const MIN_PARAGRAPH_CHARS = 20;
const TEXT_BLOCKS = 'p, li, h2, h3, blockquote';

export async function extractParagraphs(link: string): Promise<string[]> {
  const html = await fetchArticleHtml(link, {
    timeoutMs: LESSON_FETCH_TIMEOUT_MS,
    purpose: LESSON_PURPOSE,
  });
  // Very large pages would stall the main thread during parsing.
  if (html === null || html.length > MAX_HTML_CHARS) return [];

  // Loaded on demand so Readability stays out of the main bundle.
  const { Readability } = await import('@mozilla/readability');
  const parser = new DOMParser();
  const article = new Readability(parser.parseFromString(html, 'text/html')).parse();
  if (!article?.content) return [];

  const content = parser.parseFromString(article.content, 'text/html');
  // textContent drops <br>, gluing spec lines ("Name: ... Price: ...") into
  // one run-on sentence. Mark each break, then split on the marks.
  content.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  return [...content.querySelectorAll(TEXT_BLOCKS)]
    .flatMap((element) => (element.textContent ?? '').split('\n'))
    .map(normalizeWhitespace)
    .filter((text) => text.length >= MIN_PARAGRAPH_CHARS);
}
