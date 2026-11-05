import { openDB, type IDBPDatabase } from 'idb';
import type {
  RssFeedModel,
  FeedItem,
  SavedArticle,
  Lesson,
  LessonKind,
  LearningDay,
  SavedIdea,
  CachedBody,
  SeenCard,
} from '../types';

const DB_NAME = 'feeds-db';
const DB_VERSION = 4;

// Cached articles older than this are pruned on startup. Bookmarks (explicitly
// saved by the user) and subscriptions are never subject to retention.
const ARTICLE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Lessons are user progress, so they skip the article retention sweep. Caps
// keep the store small; the oldest lessons of a kind go first. Books have
// their own cap so background book builds never evict article lessons.
const MAX_LESSONS: Readonly<Record<LessonKind, number>> = { article: 100, book: 30 };

interface FeedsDB {
  subscriptions: {
    key: number;
    value: RssFeedModel;
  };
  articles: {
    key: [number, string];
    value: FeedItem;
    indexes: { 'by-feed': number; 'by-cached-at': number };
  };
  bookmarks: {
    key: string;
    value: SavedArticle;
  };
  lessons: {
    key: string;
    value: Lesson;
    indexes: { 'by-created-at': number };
  };
  learningDays: {
    key: string;
    value: LearningDay;
  };
  ideas: {
    key: string;
    value: SavedIdea;
    indexes: { 'by-review-due': number };
  };
  catalogCache: {
    key: string;
    value: CachedBody;
    indexes: { 'by-fetched-at': number };
  };
  feedSeen: {
    key: string;
    value: SeenCard;
    indexes: { 'by-seen-at': number };
  };
}

// Window events for a schema upgrade that another tab is holding up. The
// db layer only announces them; useDbUpgradeBlocked turns them into UI state.
export const DB_BLOCKED_EVENT = 'feeds-db-blocked';
export const DB_READY_EVENT = 'feeds-db-ready';

let dbPromise: Promise<IDBPDatabase<FeedsDB>> | null = null;

function getDb(): Promise<IDBPDatabase<FeedsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FeedsDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains('subscriptions')) {
          db.createObjectStore('subscriptions', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('articles')) {
          const articleStore = db.createObjectStore('articles', { keyPath: ['feedId', 'link'] });
          articleStore.createIndex('by-feed', 'feedId');
          articleStore.createIndex('by-cached-at', 'cachedAt');
        } else if (oldVersion < 2) {
          tx.objectStore('articles').createIndex('by-cached-at', 'cachedAt');
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          db.createObjectStore('bookmarks', { keyPath: 'link' });
        }
        if (!db.objectStoreNames.contains('lessons')) {
          const lessonStore = db.createObjectStore('lessons', { keyPath: 'link' });
          lessonStore.createIndex('by-created-at', 'createdAt');
        }
        if (!db.objectStoreNames.contains('learningDays')) {
          db.createObjectStore('learningDays', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('ideas')) {
          db.createObjectStore('ideas', { keyPath: 'id' }).createIndex('by-review-due', 'reviewDueAt');
        }
        if (!db.objectStoreNames.contains('catalogCache')) {
          db.createObjectStore('catalogCache', { keyPath: 'url' }).createIndex('by-fetched-at', 'fetchedAt');
        }
        if (!db.objectStoreNames.contains('feedSeen')) {
          db.createObjectStore('feedSeen', { keyPath: 'cardId' }).createIndex('by-seen-at', 'seenAt');
        }
      },
      // An older tab still holds the previous version open. Tabs running the
      // v2 code have no blocking handler, so the upgrade waits until they close.
      blocked() {
        window.dispatchEvent(new Event(DB_BLOCKED_EVENT));
      },
      // Another tab is upgrading the schema. Close this connection so the
      // upgrade is not blocked; the next call reopens at the new version.
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as IDBDatabase).close();
        dbPromise = null;
      },
    }).then((db) => {
      window.dispatchEvent(new Event(DB_READY_EVENT));
      return db;
    });
  }
  return dbPromise;
}

// Deletes cached articles older than the retention window. Safe to call on
// every app startup - a no-op when nothing has expired.
export async function pruneExpiredArticles(): Promise<void> {
  const db = await getDb();
  const cutoff = Date.now() - ARTICLE_RETENTION_MS;
  const tx = db.transaction('articles', 'readwrite');
  const index = tx.store.index('by-cached-at');
  let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// Subscriptions

export async function getAllSubscriptions(): Promise<RssFeedModel[]> {
  const db = await getDb();
  return db.getAll('subscriptions');
}

export async function addSubscription(feed: Omit<RssFeedModel, 'id'>): Promise<number> {
  const db = await getDb();
  return db.add('subscriptions', feed as RssFeedModel) as Promise<number>;
}

export async function removeSubscription(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('subscriptions', id);
}

export async function updateSuppressHeroImage(id: number, value: boolean): Promise<void> {
  const db = await getDb();
  const feed = await db.get('subscriptions', id);
  if (feed) {
    await db.put('subscriptions', { ...feed, suppressHeroImage: value });
  }
}

export async function isDbEmpty(): Promise<boolean> {
  const db = await getDb();
  const count = await db.count('subscriptions');
  return count === 0;
}

export async function seedSubscriptions(feeds: RssFeedModel[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('subscriptions', 'readwrite');
  // `put`, not `add`: seeding is idempotent this way. `add` raised
  // ConstraintError on an id that already existed, which aborted the whole
  // transaction and left tx.done rejecting with nobody awaiting it.
  // Requests are issued in one tick so the transaction cannot auto-commit
  // mid-loop.
  await Promise.all(feeds.map((feed) => tx.store.put(feed)));
  await tx.done;
}

// Articles

export async function cacheArticles(articles: FeedItem[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('articles', 'readwrite');
  const now = Date.now();
  for (const article of articles) {
    // Stamp cachedAt here so every record lands in the by-cached-at index
    // and is visible to the retention sweep, regardless of the caller.
    await tx.store.put({ ...article, cachedAt: article.cachedAt ?? now });
  }
  await tx.done;
}

export async function getArticlesByFeed(feedId: number): Promise<FeedItem[]> {
  const db = await getDb();
  return db.getAllFromIndex('articles', 'by-feed', feedId);
}

export async function getAllArticles(): Promise<FeedItem[]> {
  const db = await getDb();
  return db.getAll('articles');
}

export async function clearArticles(): Promise<void> {
  const db = await getDb();
  await db.clear('articles');
}

// Bookmarks

export async function getAllBookmarks(): Promise<SavedArticle[]> {
  const db = await getDb();
  return db.getAll('bookmarks');
}

export async function addBookmark(article: SavedArticle): Promise<void> {
  const db = await getDb();
  await db.put('bookmarks', article);
}

export async function removeBookmark(link: string): Promise<void> {
  const db = await getDb();
  await db.delete('bookmarks', link);
}

export async function isBookmarked(link: string): Promise<boolean> {
  const db = await getDb();
  const item = await db.get('bookmarks', link);
  return item !== undefined;
}

// Lessons

export async function getLesson(link: string): Promise<Lesson | undefined> {
  const db = await getDb();
  return db.get('lessons', link);
}

export async function saveLesson(lesson: Lesson): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('lessons', 'readwrite');
  await tx.store.put(lesson);
  const kind = lessonKind(lesson);
  // Oldest first, so the leading entries of a kind are the ones to drop.
  const sameKind = (await tx.store.index('by-created-at').getAll()).filter((l) => lessonKind(l) === kind);
  const excess = sameKind.slice(0, Math.max(0, sameKind.length - MAX_LESSONS[kind]));
  await Promise.all(excess.map((l) => tx.store.delete(l.link)));
  await tx.done;
}

export async function getAllLessons(): Promise<Lesson[]> {
  const db = await getDb();
  const lessons = await db.getAllFromIndex('lessons', 'by-created-at');
  return lessons.reverse();
}

export async function clearLessons(): Promise<void> {
  const db = await getDb();
  await db.clear('lessons');
}

// Learning days (streaks)

export async function getAllLearningDays(): Promise<LearningDay[]> {
  const db = await getDb();
  return db.getAll('learningDays');
}

// Marks a lesson complete and counts it toward the given day in one
// transaction, so a lesson can never count twice. Returns true only when this
// call completed the lesson.
export async function completeLesson(link: string, dateKey: string, now: number): Promise<boolean> {
  const db = await getDb();
  const tx = db.transaction(['lessons', 'learningDays'], 'readwrite');
  const lessons = tx.objectStore('lessons');
  const days = tx.objectStore('learningDays');
  const lesson = await lessons.get(link);
  if (!lesson || lesson.completedAt !== undefined) {
    await tx.done;
    return false;
  }
  const day = await days.get(dateKey);
  await lessons.put({ ...lesson, completedAt: now });
  await days.put({
    ...day,
    date: dateKey,
    lessonsCompleted: (day?.lessonsCompleted ?? 0) + 1,
    ideasViewed: day?.ideasViewed ?? 0,
    updatedAt: now,
  });
  await tx.done;
  return true;
}

function lessonKind(lesson: Lesson): LessonKind {
  return lesson.kind ?? 'article';
}

// Adds viewed feed cards to a day's count (daily goal and streak). The goal
// is stored with the day, so changing it later does not rewrite past streaks.
export async function addIdeasViewed(dateKey: string, count: number, goal: number, now: number): Promise<void> {
  if (count <= 0) return;
  const db = await getDb();
  const tx = db.transaction('learningDays', 'readwrite');
  const day = await tx.store.get(dateKey);
  await tx.store.put({
    date: dateKey,
    lessonsCompleted: day?.lessonsCompleted ?? 0,
    ideasViewed: (day?.ideasViewed ?? 0) + count,
    goal,
    updatedAt: now,
  });
  await tx.done;
}

// Saved ideas

export async function saveIdea(idea: SavedIdea): Promise<void> {
  const db = await getDb();
  await db.put('ideas', idea);
}

export async function removeIdea(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('ideas', id);
}

export async function getIdea(id: string): Promise<SavedIdea | undefined> {
  const db = await getDb();
  return db.get('ideas', id);
}

export async function getAllIdeas(): Promise<SavedIdea[]> {
  const db = await getDb();
  return db.getAll('ideas');
}

export async function clearIdeas(): Promise<void> {
  const db = await getDb();
  await db.clear('ideas');
}

// Retired ideas carry reviewDueAt null, which IndexedDB leaves out of the
// index, so the range only ever sees ideas still in review.
export async function getDueIdeas(now: number, limit: number): Promise<SavedIdea[]> {
  const db = await getDb();
  return db.getAllFromIndex('ideas', 'by-review-due', IDBKeyRange.upperBound(now), limit);
}

// Catalog cache (API bodies with a TTL)

export async function getCached(url: string): Promise<CachedBody | undefined> {
  const db = await getDb();
  return db.get('catalogCache', url);
}

export async function putCached(url: string, body: string): Promise<void> {
  const db = await getDb();
  await db.put('catalogCache', { url, body, fetchedAt: Date.now() });
}

export async function pruneCache(olderThan: number): Promise<void> {
  const db = await getDb();
  const keys = await db.getAllKeysFromIndex('catalogCache', 'by-fetched-at', IDBKeyRange.upperBound(olderThan));
  const tx = db.transaction('catalogCache', 'readwrite');
  await Promise.all(keys.map((key) => tx.store.delete(key)));
  await tx.done;
}

// Seen feed cards

export async function markSeen(cardIds: readonly string[], now: number): Promise<void> {
  if (cardIds.length === 0) return;
  const db = await getDb();
  const tx = db.transaction('feedSeen', 'readwrite');
  await Promise.all(cardIds.map((cardId) => tx.store.put({ cardId, seenAt: now })));
  await tx.done;
}

export async function getSeenSince(since: number): Promise<string[]> {
  const db = await getDb();
  const keys = await db.getAllKeysFromIndex('feedSeen', 'by-seen-at', IDBKeyRange.lowerBound(since));
  return keys.map(String);
}

export async function pruneSeen(olderThan: number): Promise<void> {
  const db = await getDb();
  const keys = await db.getAllKeysFromIndex('feedSeen', 'by-seen-at', IDBKeyRange.upperBound(olderThan));
  const tx = db.transaction('feedSeen', 'readwrite');
  await Promise.all(keys.map((key) => tx.store.delete(key)));
  await tx.done;
}
