import { describe, it, expect } from 'vitest';
import type { FeedCard, SavedIdea } from '../types';
import { EMPTY_POOLS, INITIAL_MIX_STATE, REVIEW_EVERY, SLOT_PATTERN, insertAfter, nextPage, orderPool, type FeedPools } from './feedMix';

function quote(id: string): FeedCard {
  return { id, kind: 'quote', text: id, book: { gutenbergId: 1, title: 'T', author: 'A', interest: 'philosophy', sitelinks: 0 } };
}

const idea: SavedIdea = { id: 'i', kind: 'quote', text: 't', sourceTitle: 's', sourceLink: 'l', savedAt: 0, reviewStep: 0, reviewDueAt: 0 };

// Every pool uses quote cards with prefixed ids; the prefix shows the pool.
function pool(prefix: string, count: number): FeedCard[] {
  return Array.from({ length: count }, (_, i) => quote(`${prefix}${i}`));
}

const FULL: FeedPools = {
  ...EMPTY_POOLS,
  articles: pool('a', 20),
  bookIdeas: pool('b', 20),
  topics: pool('t', 20),
  quotes: pool('q', 20),
  quizzes: pool('z', 20),
};

const PREFIX: Record<string, string> = { articles: 'a', bookIdeas: 'b', topics: 't', quotes: 'q', quizzes: 'z' };

describe('nextPage', () => {
  it('follows the slot pattern when every pool is full', () => {
    const { cards } = nextPage(FULL, INITIAL_MIX_STATE, 7);
    expect(cards.map((c) => c.id[0])).toEqual(SLOT_PATTERN.map((name) => PREFIX[name]));
  });

  it('skips empty pools', () => {
    const { cards } = nextPage({ ...EMPTY_POOLS, topics: pool('t', 3) }, INITIAL_MIX_STATE, 10);
    expect(cards.map((c) => c.id)).toEqual(['t0', 't1', 't2']);
  });

  it('serves the daily card first, once', () => {
    const pools = { ...FULL, daily: quote('daily') };
    const first = nextPage(pools, INITIAL_MIX_STATE, 5);
    const second = nextPage(pools, first.state, 5);
    expect(first.cards[0]?.id).toBe('daily');
    expect(second.cards.some((c) => c.id === 'daily')).toBe(false);
  });

  it('inserts a review card after every 8 cards', () => {
    const review: FeedCard = { id: 'r0', kind: 'review', idea };
    const { cards } = nextPage({ ...FULL, reviews: [review] }, INITIAL_MIX_STATE, 10);
    expect(cards[REVIEW_EVERY]?.id).toBe('r0');
  });

  it('returns no cards when every pool is spent', () => {
    const spent = nextPage({ ...EMPTY_POOLS, quotes: pool('q', 2) }, INITIAL_MIX_STATE, 10);
    expect(nextPage({ ...EMPTY_POOLS, quotes: pool('q', 2) }, spent.state, 10).cards).toEqual([]);
  });

  it('returns the same page for the same state', () => {
    expect(nextPage(FULL, INITIAL_MIX_STATE, 10)).toEqual(nextPage(FULL, INITIAL_MIX_STATE, 10));
  });
});

describe('orderPool', () => {
  it('moves seen cards to the back and keeps order', () => {
    expect(orderPool(pool('a', 4), new Set(['a0', 'a2'])).map((c) => c.id)).toEqual(['a1', 'a3', 'a0', 'a2']);
  });
});

describe('insertAfter', () => {
  it('inserts right after the given index', () => {
    expect(insertAfter(pool('a', 3), 0, quote('goal')).map((c) => c.id)).toEqual(['a0', 'goal', 'a1', 'a2']);
  });
});
