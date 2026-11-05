import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedCard, InterestId } from '../types';
import {
  buildArticlePool,
  buildBookPools,
  buildPools,
  EMPTY_POOLS,
  INITIAL_MIX_STATE,
  insertAfter,
  loadNewsSources,
  needsMoreBooks,
  nextPage,
  refreshNews,
  warmBooks,
  type FeedPools,
  type MixState,
  type NewsSources,
  type PoolContext,
  type TodayProgress,
} from '../learning';
import { toLocalDateKey } from '../learning/streak';

const PAGE_SIZE = 10;
const INITIAL_BOOKS = 2;
// After a refill finds nothing new, wait before trying again on scroll.
const EMPTY_REFILL_COOLDOWN_MS = 60_000;

const NO_SOURCES: NewsSources = { subscriptions: [], topFeedIds: new Set() };

export interface FeedControls {
  readonly cards: readonly FeedCard[];
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly loadMore: () => void;
  readonly checkForNew: () => void;
  readonly insertGoal: (afterIndex: number, progress: TodayProgress) => void;
  readonly trimHead: (count: number) => void;
  readonly refresh: () => void;
}

// An endless feed with no repeats. Pools and mixer state live in refs: they
// drive paging but never render. A card is served at most once; pools also
// exclude everything seen in the last 30 days. When the pools run dry the
// hook refills them (fresh news, deeper topics, new books) and, only if
// nothing new exists anywhere, ends with an "all caught up" card.
export function useFeed(interests: readonly InterestId[]): FeedControls {
  const [cards, setCards] = useState<FeedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const pools = useRef<FeedPools>(EMPTY_POOLS);
  const mix = useRef<MixState>(INITIAL_MIX_STATE);
  const served = useRef<Set<string>>(new Set());
  const sources = useRef<NewsSources>(NO_SOURCES);
  const round = useRef(0);
  const refilling = useRef(false);
  const emptyRefillAt = useRef(0);
  const endShown = useRef(false);
  const mounted = useRef(true);
  const goalDay = useRef('');
  const interestKey = interests.join(',');

  const context = useCallback(
    (): PoolContext => ({
      interests: interestKey.split(',') as InterestId[],
      now: Date.now(),
      round: round.current,
      served: served.current,
      sources: sources.current,
    }),
    [interestKey],
  );

  const takePage = useCallback((): FeedCard[] => {
    const page = nextPage(pools.current, mix.current, PAGE_SIZE);
    mix.current = page.state;
    const fresh = page.cards.filter((c) => !served.current.has(c.id));
    fresh.forEach((c) => served.current.add(c.id));
    return fresh;
  }, []);

  const append = useCallback((page: readonly FeedCard[]) => {
    if (page.length === 0) return;
    endShown.current = false;
    setCards((current) => {
      const shown = new Set(current.map((c) => c.id));
      return [...current, ...page.filter((c) => !shown.has(c.id))];
    });
  }, []);

  // New book ideas join the pool; the mixer reads the book pools from the start.
  const onBookBuilt = useCallback(() => {
    void buildBookPools(context()).then((fresh) => {
      if (!mounted.current) return;
      pools.current = { ...pools.current, ...fresh };
      mix.current = { ...mix.current, cursors: { ...mix.current.cursors, bookIdeas: 0, quotes: 0 } };
    });
  }, [context]);

  // Fresh news in the background; new articles join the article pool.
  const refreshArticles = useCallback(async () => {
    if ((await refreshNews(sources.current, Date.now())) === 0 || !mounted.current) return;
    const articles = await buildArticlePool(context());
    if (!mounted.current) return;
    pools.current = { ...pools.current, articles };
    mix.current = { ...mix.current, cursors: { ...mix.current.cursors, articles: 0 } };
  }, [context]);

  const refill = useCallback(
    async (force: boolean) => {
      if (refilling.current) return;
      if (!force && Date.now() - emptyRefillAt.current < EMPTY_REFILL_COOLDOWN_MS) return;
      refilling.current = true;
      try {
        round.current += 1;
        await refreshNews(sources.current, Date.now()).catch(() => 0);
        const ctx = context();
        if (needsMoreBooks(pools.current.bookIdeas.length - mix.current.cursors.bookIdeas)) {
          void warmBooks(ctx.interests, 1, onBookBuilt).catch(() => undefined);
        }
        pools.current = await buildPools(ctx);
        mix.current = { ...INITIAL_MIX_STATE, dailyServed: true };
        if (!mounted.current) return;
        const page = takePage();
        if (page.length > 0) {
          append(page);
          return;
        }
        emptyRefillAt.current = Date.now();
        if (!endShown.current) {
          endShown.current = true;
          setCards((current) => [...current, { id: `end:${Date.now()}`, kind: 'end' }]);
        }
      } finally {
        refilling.current = false;
      }
    },
    [context, takePage, append, onBookBuilt],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (interestKey === '') return;
    let active = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        sources.current = await loadNewsSources();
        const built = await buildPools(context());
        if (!active) return;
        pools.current = built;
        mix.current = INITIAL_MIX_STATE;
        setCards(takePage());
      } catch {
        if (active) setErrorMessage('Something went wrong. Please try again.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load().then(() => {
      if (!active) return;
      void refreshArticles().catch(() => undefined);
      void warmBooks(interestKey.split(',') as InterestId[], INITIAL_BOOKS, onBookBuilt).catch(() => {
        // Book summaries are optional; the feed works without them.
      });
    });
    return () => {
      active = false;
    };
  }, [interestKey, reloadCount, context, takePage, refreshArticles, onBookBuilt]);

  const loadMore = useCallback(() => {
    const page = takePage();
    if (page.length > 0) append(page);
    else void refill(false);
  }, [takePage, append, refill]);

  const checkForNew = useCallback(() => {
    emptyRefillAt.current = 0;
    void refill(true);
  }, [refill]);

  const insertGoal = useCallback((afterIndex: number, progress: TodayProgress) => {
    const today = toLocalDateKey(new Date());
    if (goalDay.current === today) return;
    goalDay.current = today;
    const goal: FeedCard = {
      id: `goal:${today}`,
      kind: 'goal',
      ideasViewed: progress.ideasViewed,
      goal: progress.goal,
      streak: progress.streak,
    };
    setCards((current) => insertAfter(current, afterIndex, goal));
  }, []);

  const trimHead = useCallback((count: number) => {
    setCards((current) => current.slice(count));
  }, []);

  // Served ids survive a refresh, so "Done for today" never brings back cards.
  const refresh = useCallback(() => setReloadCount((n) => n + 1), []);

  return { cards, isLoading, errorMessage, loadMore, checkForNew, insertGoal, trimHead, refresh };
}
