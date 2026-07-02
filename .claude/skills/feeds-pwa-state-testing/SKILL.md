---
name: feeds-pwa-state-testing
description: Gold Standard 4-branch state management pattern and Vitest testing rules for feeds-pwa. Use when building or editing any screen/hook that fetches or displays async data (loading/error/empty states), handling errors, filtering/searching, or writing/updating tests.
---

# Gold Standard State Management and Testing

**Mandatory pattern** for all screens/components that fetch and display async data. Mirrors the native SwiftUI 4-branch pattern.

## State Structure (Required Elements)

Every async data-loading screen must manage:

1. **Data state** - `items: FeedItem[]` (raw data from service, always initialized to `[]`)
2. **Loading state** - `isLoading: boolean` (true during fetch)
3. **Error state** - `errorMessage: string | null` (user-safe error, null on success)
4. **Filter inputs** - `searchText`, `selectedCategory` stored in state
5. **Derived/computed** - `filteredItems`, `hasItems`, `resultCount` (never stored, always computed fresh)

## 4-Branch Rendering Pattern (Exact Order)

```typescript
if (isLoading) {
  // BRANCH 1: Loading - skeleton/spinner
} else if (errorMessage) {
  // BRANCH 2: Error - message + "Try Again" action (always provided)
} else if (items.length > 0) {
  // BRANCH 3: Data - content + filters (render filteredItems, never raw items)
} else {
  // BRANCH 4: Empty - guidance message
}
```

## Error Handling (Three Levels)

1. **Network** (fetch failures, timeouts): "Network error. Please check your connection."
2. **Parsing** (invalid XML): "Unable to read feed data."
3. **Unexpected** (catch-all): "Something went wrong. Please try again."

Typed catches: `TypeError` for network, typed `FeedError` objects (`{ type: 'network' | 'parsing' | 'unavailable', message, status? }`) for service errors, catch-all for the rest.

## Non-Negotiable Rules

1. Set `isLoading = true` at start and `false` in exactly one place: the `finally` block.
2. Always initialize collections to `[]` - never `undefined`.
3. Keep filter/search logic in the service/hook layer as pure computed derivations - never in components.
4. Never skip a branch - always render all 4, in order.
5. Never show raw error strings to users.

## Anti-Patterns

- DO NOT display `items` directly - use computed `filteredItems`
- DO NOT set `isLoading = false` in multiple places - use `finally`
- DO NOT catch errors silently - always set `errorMessage` or log
- DO NOT store computed results in state - derive fresh each render
- DO NOT use non-null assertions (`!`) on state values - use optional chaining or guards

## Testing Rules (Vitest)

1. Vitest for unit tests, co-located with source (`feed/parser.ts` -> `feed/parser.test.ts`) or in a parallel `__tests__/` folder.
2. Test: XML parsing (RSS 2.0, Atom, edge cases), IndexedDB operations, proxy fallback behavior (mock `fetch`), pure utilities, and state flows (`isLoading` false after completion, `errorMessage` set on failure / null on success).
3. Name tests descriptively: `describe('parseRssXml')` -> `it('extracts title, link, and pubDate from RSS 2.0 item')`.
4. Run `npm run build` to verify zero TypeScript errors before completion.
5. Validate accessibility with automated checks (axe-core or similar) on key screens.

### Test Patterns

```typescript
// src/feed/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseRssXml } from './parser';

const mockRssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><item>
  <title>Test Article</title>
  <link>https://example.com/article-1</link>
  <description>A test article description</description>
  <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
  <enclosure url="https://example.com/image.jpg" type="image/jpeg" />
</item></channel></rss>`;

describe('parseRssXml', () => {
  it('extracts feed items from valid RSS 2.0 XML', () => {
    const items = parseRssXml(mockRssXml, 1);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Test Article');
    expect(items[0].imageUrls).toContain('https://example.com/image.jpg');
  });

  it('returns empty array for invalid XML', () => {
    expect(parseRssXml('<invalid>', 1)).toHaveLength(0);
  });
});
```

```typescript
// State flow test: mock fetch, assert the gold-standard invariants
it('sets user-safe error message on network failure', async () => {
  vi.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
  const state = await loadFeed(testFeed);
  expect(state.isLoading).toBe(false);
  expect(state.errorMessage).toBe('Network error. Please check your connection.');
  expect(state.items).toEqual([]);
});
```
