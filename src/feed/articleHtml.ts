import { buildProxyUrl, fetchWithTimeout } from './proxy';

export interface ArticleHtmlOptions {
  readonly timeoutMs: number;
  // Tags the proxy request so the service worker can cache it (see sw.ts).
  readonly purpose?: string;
}

interface HtmlFetch {
  readonly html: string | null;
  // True when a server replied at all, even with an error status. False means
  // the request never completed, so the next tier is still worth trying.
  readonly answered: boolean;
}

// Tier 1 is the Cloudflare Worker proxy, which passes the bot checks and CORS
// blocks that make direct article-HTML fetches fail on most sites. Tier 2, the
// direct fetch, only runs when the proxy itself never answered: once the proxy
// has relayed an origin status such as 404, the article is genuinely gone and
// retrying it directly can only repeat that failure with a CORS error on top.
export async function fetchArticleHtml(
  articleUrl: string,
  options: ArticleHtmlOptions,
): Promise<string | null> {
  const proxyUrl = buildProxyUrl(articleUrl, options.purpose);
  const proxied = await tryFetchHtml(proxyUrl, options.timeoutMs);
  if (proxied.answered) return proxied.html;
  return (await tryFetchHtml(articleUrl, options.timeoutMs)).html;
}

async function tryFetchHtml(url: string, timeoutMs: number): Promise<HtmlFetch> {
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (!res.ok) return { html: null, answered: true };
    return { html: await res.text(), answered: true };
  } catch {
    // Network failure, CORS block, or timeout. Callers treat a missing page
    // as "no data" and fall back, so this is never surfaced to the reader.
    return { html: null, answered: false };
  }
}
