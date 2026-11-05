import type { FeedCard } from '../types';

// Pure interleaving of content pools into feed pages (plan Section 8.5).
// Deterministic: the same pools and state always give the same page.

export type PoolName = 'articles' | 'bookIdeas' | 'topics' | 'quotes' | 'quizzes';

export interface FeedPools {
  readonly articles: readonly FeedCard[];
  readonly bookIdeas: readonly FeedCard[];
  readonly topics: readonly FeedCard[];
  readonly quotes: readonly FeedCard[];
  readonly quizzes: readonly FeedCard[];
  readonly reviews: readonly FeedCard[];
  readonly daily: FeedCard | null;
}

export interface MixState {
  readonly slot: number;
  readonly cursors: Readonly<Record<PoolName | 'reviews', number>>;
  readonly sinceReview: number;
  readonly dailyServed: boolean;
}

// Decision D2: two news cards in every seven.
export const SLOT_PATTERN: readonly PoolName[] = [
  'articles', 'bookIdeas', 'topics', 'articles', 'quizzes', 'bookIdeas', 'quotes',
];
export const REVIEW_EVERY = 8;

export const EMPTY_POOLS: FeedPools = {
  articles: [], bookIdeas: [], topics: [], quotes: [], quizzes: [], reviews: [], daily: null,
};

export const INITIAL_MIX_STATE: MixState = {
  slot: 0,
  cursors: { articles: 0, bookIdeas: 0, topics: 0, quotes: 0, quizzes: 0, reviews: 0 },
  sinceReview: 0,
  dailyServed: false,
};

export interface FeedPage {
  readonly cards: FeedCard[];
  readonly state: MixState;
}

export function nextPage(pools: FeedPools, state: MixState, pageSize: number): FeedPage {
  const cards: FeedCard[] = [];
  const cursors = { ...state.cursors };
  let { slot, sinceReview, dailyServed } = state;

  if (!dailyServed && pools.daily) {
    cards.push(pools.daily);
    dailyServed = true;
  }

  // Stop after one full pattern pass that found nothing: every pool is spent.
  let emptySlots = 0;
  const limit = pageSize * SLOT_PATTERN.length;
  for (let step = 0; step < limit && cards.length < pageSize && emptySlots < SLOT_PATTERN.length; step += 1) {
    const review = sinceReview >= REVIEW_EVERY ? pools.reviews[cursors.reviews] : undefined;
    if (review) {
      cards.push(review);
      cursors.reviews += 1;
      sinceReview = 0;
      continue;
    }
    const name = SLOT_PATTERN[slot % SLOT_PATTERN.length] ?? 'articles';
    slot += 1;
    const card = pools[name][cursors[name]];
    if (!card) {
      emptySlots += 1;
      continue;
    }
    cards.push(card);
    cursors[name] += 1;
    sinceReview += 1;
    emptySlots = 0;
  }
  return { cards, state: { slot, cursors, sinceReview, dailyServed } };
}

// Seen cards go to the back but are never dropped, so an offline feed with a
// small cache keeps cycling instead of running dry.
export function orderPool(cards: readonly FeedCard[], seenIds: ReadonlySet<string>): FeedCard[] {
  return [...cards.filter((c) => !seenIds.has(c.id)), ...cards.filter((c) => seenIds.has(c.id))];
}

export function insertAfter(cards: readonly FeedCard[], index: number, card: FeedCard): FeedCard[] {
  const at = Math.min(Math.max(index + 1, 0), cards.length);
  return [...cards.slice(0, at), card, ...cards.slice(at)];
}

// Round-robin merge, so one source cannot fill a pool on its own.
export function interleave<T>(lists: readonly (readonly T[])[]): T[] {
  const longest = Math.max(0, ...lists.map((l) => l.length));
  const merged: T[] = [];
  for (let i = 0; i < longest; i += 1) {
    for (const list of lists) {
      const item = list[i];
      if (item !== undefined) merged.push(item);
    }
  }
  return merged;
}
