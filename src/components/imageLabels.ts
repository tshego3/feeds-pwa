// Pure helpers for image placeholders (no React), so they can be tested.

// "Daily Investor" -> "DI", "WIRED" -> "W", "Stack Overflow" -> "SO".
export function monogram(label: string): string {
  const words = label.split(/[\s.\-_/]+/).filter((w) => /^\p{L}/u.test(w));
  const letters = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase());
  return letters.join('') || '\u00B7';
}

// Second-level labels in country domains such as .co.za and .com.au.
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'ac', 'edu']);

// A readable source name for an article: the feed title when known,
// otherwise the site's name from its host ("mybroadband.co.za" -> "Mybroadband").
export function sourceLabel(link: string, feedTitle?: string): string {
  if (feedTitle) return feedTitle;
  try {
    const parts = new URL(link).hostname.replace(/^www\./, '').split('.');
    const secondLast = parts[parts.length - 2] ?? '';
    const index = parts.length > 2 && SECOND_LEVEL.has(secondLast) ? parts.length - 3 : parts.length - 2;
    const name = parts[Math.max(0, index)] ?? '';
    return name === '' ? 'Article' : name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Article';
  }
}
