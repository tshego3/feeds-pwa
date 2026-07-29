// Article identity is derived from the link. Shared so the app's DOMParser
// path (src/feed/parser.ts) and the service worker's regex path (src/sw.ts)
// produce the same id for the same article — when they disagreed, every
// article cached in the background looked new again on the next foreground
// refresh and fired a duplicate notification burst.
export function generateId(link: string): string {
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    const char = link.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
