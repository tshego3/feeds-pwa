import { openDB, type IDBPDatabase } from 'idb';
import type { RssFeedModel, FeedItem, SavedArticle } from '../types';

const DB_NAME = 'feeds-db';
const DB_VERSION = 1;

interface FeedsDB {
  subscriptions: {
    key: number;
    value: RssFeedModel;
  };
  articles: {
    key: [number, string];
    value: FeedItem;
    indexes: { 'by-feed': number };
  };
  bookmarks: {
    key: string;
    value: SavedArticle;
  };
}

let dbPromise: Promise<IDBPDatabase<FeedsDB>> | null = null;

function getDb(): Promise<IDBPDatabase<FeedsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FeedsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('subscriptions')) {
          db.createObjectStore('subscriptions', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('articles')) {
          const articleStore = db.createObjectStore('articles', { keyPath: ['feedId', 'link'] });
          articleStore.createIndex('by-feed', 'feedId');
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          db.createObjectStore('bookmarks', { keyPath: 'link' });
        }
      },
    });
  }
  return dbPromise;
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
  for (const feed of feeds) {
    await tx.store.add(feed);
  }
  await tx.done;
}

// Articles

export async function cacheArticles(articles: FeedItem[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('articles', 'readwrite');
  for (const article of articles) {
    await tx.store.put(article);
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
