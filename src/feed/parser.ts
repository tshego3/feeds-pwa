import type { FeedItem } from '../types';

export function parseRssXml(xml: string, feedId: number): FeedItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) return [];

  const items = doc.querySelectorAll('item');
  const results: FeedItem[] = [];

  items.forEach((item) => {
    const title = item.querySelector('title')?.textContent?.trim() ?? '';
    const link = item.querySelector('link')?.textContent?.trim() ?? '';
    const rawDescription =
      item.querySelector('description')?.textContent?.trim() ?? '';
    const pubDate = item.querySelector('pubDate')?.textContent?.trim() ?? '';
    const imageUrls = extractImageUrls(item);

    if (!title || !link) return;

    results.push({
      id: generateId(link),
      feedId,
      title,
      link,
      description: stripHtml(rawDescription),
      pubDate,
      imageUrls,
    });
  });

  return results;
}

function stripHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.textContent?.trim() ?? '';
}

function extractImageUrls(item: Element): string[] {
  const urls: string[] = [];

  // <enclosure url="...">
  const enclosure = item.querySelector('enclosure');
  const enclosureUrl = enclosure?.getAttribute('url');
  if (enclosureUrl) urls.push(enclosureUrl);

  // <media:content url="...">
  const mediaContent =
    item.querySelector('media\\:content, content');
  const mediaUrl = mediaContent?.getAttribute('url');
  if (mediaUrl) urls.push(mediaUrl);

  // <media:thumbnail url="...">
  const mediaThumbnail =
    item.querySelector('media\\:thumbnail, thumbnail');
  const thumbUrl = mediaThumbnail?.getAttribute('url');
  if (thumbUrl) urls.push(thumbUrl);

  // <image> text content
  const imageEl = item.querySelector('image');
  const imageText = imageEl?.textContent?.trim();
  if (imageText && imageText.startsWith('http')) urls.push(imageText);

  // img in content:encoded
  const contentEncoded =
    item.querySelector('content\\:encoded, encoded')?.textContent ?? '';
  const imgMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch?.[1]) urls.push(imgMatch[1]);

  return [...new Set(urls)];
}

function generateId(link: string): string {
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    const char = link.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
