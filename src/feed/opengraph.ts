const ogCache = new Map<string, string | null>();

export async function fetchOGImageUrl(articleUrl: string): Promise<string | null> {
  if (ogCache.has(articleUrl)) {
    return ogCache.get(articleUrl) ?? null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(articleUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      ogCache.set(articleUrl, null);
      return null;
    }

    const html = await res.text();
    const match = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    );

    const url = match?.[1] ? decodeHtmlEntities(match[1]) : null;
    ogCache.set(articleUrl, url);
    return url;
  } catch {
    ogCache.set(articleUrl, null);
    return null;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(parseInt(dec, 10)),
    )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
