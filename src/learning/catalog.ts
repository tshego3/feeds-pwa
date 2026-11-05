import type { BookCatalog, BookRef, InterestId } from '../types';
import { fetchWithTimeout } from '../feed/proxy';
import { INTEREST_IDS, isInterestId } from './sources';

// Loads the generated book list (scripts/build-learning-catalog.mjs). It is
// precached by the service worker, so it is available offline. Book choice
// never touches Gutenberg's website.

const CATALOG_TIMEOUT_MS = 10_000;

export const EMPTY_CATALOG: BookCatalog = {
  generatedAt: '',
  catalogDate: '',
  interests: emptyInterests(),
};

let catalogPromise: Promise<BookCatalog> | null = null;

export function loadBookCatalog(): Promise<BookCatalog> {
  catalogPromise ??= fetchCatalog().catch(() => {
    catalogPromise = null;
    return EMPTY_CATALOG;
  });
  return catalogPromise;
}

async function fetchCatalog(): Promise<BookCatalog> {
  const res = await fetchWithTimeout(`${import.meta.env.BASE_URL}learning/books.json`, CATALOG_TIMEOUT_MS);
  if (!res.ok) throw new Error(`books.json HTTP ${res.status}`);
  return toBookCatalog((await res.json()) as unknown);
}

export function toBookCatalog(value: unknown): BookCatalog {
  if (typeof value !== 'object' || value === null) return EMPTY_CATALOG;
  const raw = value as { readonly generatedAt?: unknown; readonly catalogDate?: unknown; readonly interests?: unknown };
  const lists = typeof raw.interests === 'object' && raw.interests !== null ? raw.interests : {};
  const interests = emptyInterests();
  for (const [key, list] of Object.entries(lists)) {
    if (isInterestId(key) && Array.isArray(list)) interests[key] = list.filter(isBookRef);
  }
  return {
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : '',
    catalogDate: typeof raw.catalogDate === 'string' ? raw.catalogDate : '',
    interests,
  };
}

export function isBookRef(value: unknown): value is BookRef {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Partial<Record<keyof BookRef, unknown>>;
  return (
    typeof b.gutenbergId === 'number' &&
    Number.isInteger(b.gutenbergId) &&
    b.gutenbergId > 0 &&
    typeof b.title === 'string' &&
    b.title !== '' &&
    typeof b.author === 'string' &&
    isInterestId(b.interest) &&
    typeof b.sitelinks === 'number'
  );
}

export function booksFor(catalog: BookCatalog, interest: InterestId, offset: number, count: number): BookRef[] {
  return catalog.interests[interest].slice(offset, offset + count);
}

export interface NextBook {
  readonly book: BookRef | null;
  readonly cursor: number;
}

// Walks the interests round-robin, taking each interest's best book that is
// not excluded. The cursor counts steps, so repeated calls rotate interests.
export function nextBook(
  catalog: BookCatalog,
  interests: readonly InterestId[],
  exclude: ReadonlySet<number>,
  cursor: number,
): NextBook {
  if (interests.length === 0) return { book: null, cursor };
  const longest = Math.max(0, ...interests.map((id) => catalog.interests[id].length));
  const limit = interests.length * longest;
  for (let step = 0; step < limit; step += 1) {
    const interest = interests[(cursor + step) % interests.length];
    if (!interest) continue;
    const book = catalog.interests[interest].find((b) => !exclude.has(b.gutenbergId));
    if (book) return { book, cursor: cursor + step + 1 };
  }
  return { book: null, cursor };
}

function emptyInterests(): Record<InterestId, BookRef[]> {
  return Object.fromEntries(INTEREST_IDS.map((id) => [id, []])) as unknown as Record<InterestId, BookRef[]>;
}
