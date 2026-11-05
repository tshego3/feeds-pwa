import type { BookCatalog, BookRef, FeedCard, FeedItem, InterestId, Lesson, TopicSummary } from '../types';
import { getAllArticles, getSeenSince, markSeen } from '../db';
import { getMutedInterests } from '../preferences';
import { bookLink, canBuildMoreBooks, getOrBuildBook, listBuiltBooks } from './books';
import { loadBookCatalog, nextBook } from './catalog';
import { EMPTY_POOLS, interleave, type FeedPools } from './feedMix';
import { listDueReviews } from './ideas';
import type { NewsSources } from './newsSource';
import { toLocalDateKey } from './streak';
import { nextQuiz } from './trivia';
import { fetchDailyTopic, freshTopicsForInterest } from './wikipedia';

// Gathers every content stream into pools for the mixer. Pools never hold a
// card the reader has already been shown (seen in the last 30 days, or served
// this session), so the feed never repeats: when pools run dry the feed asks
// for more content instead of starting over.
//
// Each source runs with a time budget: a slow or failed API leaves its pool
// empty for this round, and the rest of the feed still loads.

const MAX_ARTICLES = 200;
const ARTICLE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TOPICS = 60;
const MAX_QUIZ_INTERESTS = 3;
const MAX_REVIEWS = 5;
const SOURCE_BUDGET_MS = 4_000;
// Matches the feedSeen retention, so a card is never shown twice in 30 days.
const SEEN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// Top feeds get this many slots for every slot of another feed.
const TOP_FEED_WEIGHT = 2;
// Build another book when fewer unseen book ideas than this remain.
const LOW_BOOK_IDEAS = 6;

export interface PoolContext {
  readonly interests: readonly InterestId[];
  readonly now: number;
  /** Advances on every refill, so topics rotate through categories. */
  readonly round: number;
  /** Card ids already served this session. */
  readonly served: ReadonlySet<string>;
  readonly sources: NewsSources;
}

export async function buildPools(context: PoolContext): Promise<FeedPools> {
  const exclude = await excludedIds(context);
  const active = activeInterests(context.interests, context.now);
  const isNew = (card: FeedCard) => !exclude.has(card.id);
  const [articles, books, topics, quizzes, reviews, daily] = await Promise.all([
    settle(articleCards(context.sources, exclude), []),
    settle(bookCards(active), { ideas: [], quotes: [] }),
    settle(topicCards(active, context.round, exclude), []),
    settle(quizCards(active, context.round), []),
    settle(reviewCards(), []),
    settle(dailyCard(context.now), null),
  ]);
  return {
    ...EMPTY_POOLS,
    articles,
    bookIdeas: books.ideas.filter(isNew),
    quotes: books.quotes.filter(isNew),
    topics,
    quizzes: quizzes.filter(isNew),
    reviews: reviews.filter(isNew),
    daily: daily && isNew(daily) ? daily : null,
  };
}

// Book idea and quote pools only, for refreshing after a book finishes
// without touching the other sources (quiz pools are consumed on read).
export async function buildBookPools(context: PoolContext): Promise<Pick<FeedPools, 'bookIdeas' | 'quotes'>> {
  const exclude = await excludedIds(context);
  const books = await settle(bookCards(activeInterests(context.interests, context.now)), { ideas: [], quotes: [] });
  return {
    bookIdeas: books.ideas.filter((c) => !exclude.has(c.id)),
    quotes: books.quotes.filter((c) => !exclude.has(c.id)),
  };
}

export async function buildArticlePool(context: PoolContext): Promise<FeedCard[]> {
  return settle(articleCards(context.sources, await excludedIds(context)), []);
}

// Builds up to `count` books, one at a time, calling onBuilt after each so
// the feed can add the new ideas. Stops at the session's background limit.
export async function warmBooks(interests: readonly InterestId[], count: number, onBuilt: () => void): Promise<void> {
  const catalog = await loadBookCatalog();
  const exclude = new Set(builtIds(catalog, await listBuiltBooks()));
  let cursor = 0;
  for (let built = 0; built < count && canBuildMoreBooks(); built += 1) {
    const next = nextBook(catalog, activeInterests(interests, Date.now()), exclude, cursor);
    if (!next.book) return;
    cursor = next.cursor;
    exclude.add(next.book.gutenbergId);
    try {
      await getOrBuildBook(next.book, { background: true });
      onBuilt();
    } catch {
      // One unavailable book should not stop the others.
    }
  }
}

export function needsMoreBooks(remainingBookIdeas: number): boolean {
  return remainingBookIdeas < LOW_BOOK_IDEAS;
}

export function recordSeen(cardIds: readonly string[]): Promise<void> {
  return markSeen(cardIds, Date.now());
}

async function excludedIds(context: PoolContext): Promise<Set<string>> {
  const seen = await settle(getSeenSince(context.now - SEEN_WINDOW_MS), []);
  return new Set([...seen, ...context.served]);
}

function activeInterests(interests: readonly InterestId[], now: number): InterestId[] {
  const muted = new Set(getMutedInterests(now));
  const active = interests.filter((id) => !muted.has(id));
  return active.length > 0 ? active : [...interests];
}

// Every subscription contributes, newest first within each feed. Feeds are
// interleaved so no single feed floods the pool, and top feeds get
// TOP_FEED_WEIGHT slots for each slot of the others.
async function articleCards(sources: NewsSources, exclude: ReadonlySet<string>): Promise<FeedCard[]> {
  const articles = await getAllArticles();
  const titles = new Map(sources.subscriptions.map((s) => [s.id, s.title]));
  const cutoff = Date.now() - ARTICLE_MAX_AGE_MS;
  const seenLinks = new Set<string>();
  const byFeed = new Map<number, FeedCard[]>();
  for (const article of [...articles].sort((a, b) => publishedAt(b) - publishedAt(a))) {
    const title = titles.get(article.feedId);
    const card = articleCard(article, title ?? 'News');
    const fresh = (publishedAt(article) || (article.cachedAt ?? 0)) >= cutoff;
    if (title === undefined || !fresh || exclude.has(card.id) || seenLinks.has(article.link)) continue;
    seenLinks.add(article.link);
    byFeed.set(article.feedId, [...(byFeed.get(article.feedId) ?? []), card]);
  }
  const top = [...byFeed].filter(([id]) => sources.topFeedIds.has(id)).map(([, cards]) => cards);
  const others = [...byFeed].filter(([id]) => !sources.topFeedIds.has(id)).map(([, cards]) => cards);
  return weightedMerge(interleave(top), interleave(others), TOP_FEED_WEIGHT).slice(0, MAX_ARTICLES);
}

function articleCard(article: FeedItem, feedTitle: string): FeedCard {
  return { id: `article:${article.feedId}:${article.link}`, kind: 'article', article, feedTitle };
}

// Takes `weight` items from `primary` for each item from `secondary`.
export function weightedMerge<T>(primary: readonly T[], secondary: readonly T[], weight: number): T[] {
  const merged: T[] = [];
  let p = 0;
  let s = 0;
  while (p < primary.length || s < secondary.length) {
    for (let i = 0; i < weight && p < primary.length; i += 1) {
      const item = primary[p];
      p += 1;
      if (item !== undefined) merged.push(item);
    }
    const item = secondary[s];
    s += 1;
    if (item !== undefined) merged.push(item);
  }
  return merged;
}

interface BookCards {
  readonly ideas: FeedCard[];
  readonly quotes: FeedCard[];
}

async function bookCards(interests: readonly InterestId[]): Promise<BookCards> {
  const [catalog, lessons] = await Promise.all([loadBookCatalog(), listBuiltBooks()]);
  const refs = refsByLink(catalog);
  const wanted = new Set(interests);
  const books = lessons
    .map((lesson) => ({ lesson, ref: refs.get(lesson.link) }))
    .filter((b): b is { lesson: Lesson; ref: BookRef } => b.ref !== undefined && wanted.has(b.ref.interest));
  return {
    ideas: interleave(books.map(({ lesson, ref }) => lesson.cards.map((idea): FeedCard => ({ id: `book:${ref.gutenbergId}:${idea.index}`, kind: 'book-idea', book: ref, idea, total: lesson.cards.length })))),
    quotes: interleave(books.map(({ lesson, ref }) => (lesson.quotes ?? []).map((text, i): FeedCard => ({ id: `quote:${ref.gutenbergId}:${i}`, kind: 'quote', text, book: ref })))),
  };
}

async function topicCards(interests: readonly InterestId[], round: number, exclude: ReadonlySet<string>): Promise<FeedCard[]> {
  const isSeen = (title: string) => exclude.has(`topic:${title}`);
  const lists = await Promise.all(
    interests.map((interest) =>
      settle(freshTopicsForInterest(interest, round, isSeen), []).then((topics) => topics.map((topic) => topicCard(topic, interest))),
    ),
  );
  const titles = new Set<string>();
  return interleave(lists)
    .filter((card) => card.kind === 'topic' && !titles.has(card.topic.title) && titles.add(card.topic.title))
    .slice(0, MAX_TOPICS);
}

function topicCard(topic: TopicSummary, interest: InterestId): FeedCard {
  return { id: `topic:${topic.title}`, kind: 'topic', topic, interest };
}

async function quizCards(interests: readonly InterestId[], round: number): Promise<FeedCard[]> {
  const cards: FeedCard[] = [];
  // Sequential on purpose: the trivia API allows one request per 5 s.
  for (const interest of interests.slice(0, MAX_QUIZ_INTERESTS)) {
    const quiz = await nextQuiz(interest, round).catch(() => null);
    if (quiz) cards.push({ id: `quiz:${quiz.id}`, kind: 'quiz', quiz });
  }
  return cards;
}

async function reviewCards(): Promise<FeedCard[]> {
  const due = await listDueReviews(MAX_REVIEWS);
  return due.map((idea) => ({ id: `review:${idea.id}:${idea.reviewStep}`, kind: 'review', idea }));
}

async function dailyCard(now: number): Promise<FeedCard | null> {
  const date = new Date(now);
  const daily = await fetchDailyTopic(date);
  return daily ? { id: `daily:${toLocalDateKey(date)}`, kind: 'daily', topic: daily.topic, label: daily.label } : null;
}

function refsByLink(catalog: BookCatalog): Map<string, BookRef> {
  const refs = new Map<string, BookRef>();
  for (const list of Object.values(catalog.interests)) {
    for (const ref of list) refs.set(bookLink(ref.gutenbergId), ref);
  }
  return refs;
}

function builtIds(catalog: BookCatalog, lessons: readonly Lesson[]): number[] {
  const refs = refsByLink(catalog);
  return lessons.map((l) => refs.get(l.link)?.gutenbergId).filter((id): id is number => id !== undefined);
}

function publishedAt(article: FeedItem): number {
  const time = Date.parse(article.pubDate);
  return Number.isNaN(time) ? 0 : time;
}

// Resolves to the fallback when the source fails or exceeds its budget.
function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), SOURCE_BUDGET_MS);
  });
  return Promise.race([promise.catch(() => fallback), timeout]).finally(() => clearTimeout(timer));
}
