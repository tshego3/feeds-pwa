// Regex feed parser for the service worker's background refresh.
//
// DOMParser does not exist in a service worker, so this mirrors
// src/feed/parser.ts without the DOM. It has to cover Atom <entry> as well as
// RSS <item>: the push worker detects new Atom entries too, so an item-only
// parser meant those feeds pushed a notification and then cached nothing.
// It also extracts description/pubDate/images — background records used to be
// written as stubs, which left cached articles undated and blank until the app
// was next opened.
//
// Kept out of src/sw.ts so it can be tested in node, where the worker's
// top-level `self.addEventListener` wiring cannot run.

import type { FeedItem } from '../types';
import { generateId } from './articleId';

const MAX_ITEMS_PER_FEED = 100;

export function parseFeedXmlSw(xml: string, feedId: number): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gi;
  const now = Date.now();
  let match = itemRegex.exec(xml);

  while (match && items.length < MAX_ITEMS_PER_FEED) {
    const block = match[2] ?? '';
    const link = extractLink(block);
    const title = stripHtml(textOf(block, 'title'));

    if (link && title) {
      items.push({
        id: generateId(link),
        feedId,
        title,
        link,
        description: stripHtml(textOf(block, 'description', 'summary', 'content:encoded')),
        pubDate: textOf(block, 'pubDate', 'published', 'updated', 'dc:date'),
        imageUrls: extractImageUrls(block),
        cachedAt: now,
      });
    }
    match = itemRegex.exec(xml);
  }
  return items;
}

// First non-empty match wins, so callers can list fallback tags in priority order.
function textOf(block: string, ...tags: string[]): string {
  for (const tag of tags) {
    const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}\\s*>`, 'i').exec(block);
    const value = unwrapCdata(match?.[1] ?? '').trim();
    if (value) return value;
  }
  return '';
}

function extractLink(block: string): string {
  // RSS: <link>https://…</link>
  const rss = /<link(?:\s[^>]*)?>([\s\S]*?)<\/link\s*>/i.exec(block);
  const rssLink = unwrapCdata(rss?.[1] ?? '').trim();
  if (rssLink.startsWith('http')) return rssLink;

  // Atom: the alternate link is the article; other rels are self/replies/enclosures.
  const alternate = /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i.exec(block);
  if (alternate?.[1]) return decodeEntities(alternate[1]).trim();

  const anyHref = /<link[^>]*href=["']([^"']+)["']/i.exec(block);
  return anyHref?.[1] ? decodeEntities(anyHref[1]).trim() : '';
}

function extractImageUrls(block: string): string[] {
  const urls: string[] = [];
  const attrPatterns = [
    /<enclosure[^>]+url=["']([^"']+)["']/i,
    /<media:content[^>]+url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
  ];
  for (const pattern of attrPatterns) {
    const match = pattern.exec(block);
    if (match?.[1]) urls.push(decodeEntities(match[1]));
  }
  const img = /<img[^>]+src=["']([^"']+)["']/i.exec(unwrapCdata(block));
  if (img?.[1]) urls.push(decodeEntities(img[1]));

  return [...new Set(urls.filter((url) => url.startsWith('http')))];
}

function unwrapCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');
}

// Feed text is untrusted and is rendered by the app, so tags are stripped here
// exactly as the DOM parser strips them in the foreground path.
function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#0*39);/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
