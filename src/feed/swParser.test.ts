import { describe, it, expect } from 'vitest';
import { parseFeedXmlSw } from './swParser';
import { generateId } from './articleId';

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Example Channel</title>
    <link>https://example.com</link>
    <item>
      <title><![CDATA[Rand &amp; rates rally]]></title>
      <link>https://example.com/a</link>
      <description><![CDATA[<p>Markets <b>moved</b> today.</p>]]></description>
      <pubDate>Tue, 28 Jul 2026 08:00:00 +0200</pubDate>
      <media:content url="https://cdn.example.com/a.jpg" />
    </item>
    <item>
      <title>Second story</title>
      <link>https://example.com/b</link>
      <content:encoded><![CDATA[<img src="https://cdn.example.com/b.jpg"/>Body text]]></content:encoded>
      <pubDate>Mon, 27 Jul 2026 08:00:00 +0200</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Example</title>
  <entry>
    <title>Atom story</title>
    <link rel="self" href="https://example.com/feed/self"/>
    <link rel="alternate" href="https://example.com/atom-a"/>
    <summary>A short &amp; sweet summary</summary>
    <published>2026-07-28T06:00:00Z</published>
  </entry>
</feed>`;

describe('parseFeedXmlSw', () => {
  it('parses RSS items with description, date and images', () => {
    const items = parseFeedXmlSw(RSS, 1);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      feedId: 1,
      title: 'Rand & rates rally',
      link: 'https://example.com/a',
      description: 'Markets moved today.',
      pubDate: 'Tue, 28 Jul 2026 08:00:00 +0200',
      imageUrls: ['https://cdn.example.com/a.jpg'],
    });
    expect(items[1]?.imageUrls).toEqual(['https://cdn.example.com/b.jpg']);
  });

  it('does not mistake the channel link for an item link', () => {
    expect(parseFeedXmlSw(RSS, 1).map((i) => i.link)).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ]);
  });

  it('parses Atom entries, preferring the alternate link over rel="self"', () => {
    const items = parseFeedXmlSw(ATOM, 2);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      feedId: 2,
      title: 'Atom story',
      link: 'https://example.com/atom-a',
      description: 'A short & sweet summary',
      pubDate: '2026-07-28T06:00:00Z',
    });
  });

  it('stamps cachedAt so records reach the retention index', () => {
    for (const item of parseFeedXmlSw(RSS, 1)) {
      expect(item.cachedAt).toBeTypeOf('number');
    }
  });

  it('derives ids the same way the foreground parser does', () => {
    // Both parsers key off shared generateId(link). When they disagreed, every
    // background-cached article looked new again on the next foreground
    // refresh and fired a duplicate notification burst.
    for (const item of parseFeedXmlSw(RSS, 1)) {
      expect(item.id).toBe(generateId(item.link));
    }
  });

  it('returns nothing for a non-feed body instead of throwing', () => {
    expect(parseFeedXmlSw('<html><body>Blocked</body></html>', 1)).toEqual([]);
  });
});
