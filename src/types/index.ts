export interface RssFeedModel {
  readonly id: number;
  readonly title: string;
  readonly url: string;
  readonly groupId?: string;
  readonly groupTitle?: string;
  readonly sortOrder: number;
  readonly suppressHeroImage: boolean;
}

export type FeedMenuItem =
  | { readonly type: 'single'; readonly feed: RssFeedModel }
  | { readonly type: 'group'; readonly id: string; readonly title: string; readonly feeds: readonly RssFeedModel[] };

export interface FeedItem {
  readonly id: string;
  readonly feedId: number;
  readonly title: string;
  readonly link: string;
  readonly description: string;
  readonly pubDate: string;
  readonly imageUrls: readonly string[];
  /** Epoch ms when the record was cached; stamped by the db layer on write. */
  readonly cachedAt?: number;
}

export interface SavedArticle {
  readonly link: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl?: string;
  readonly feedTitle: string;
  readonly savedAt: number;
}

export type FeedErrorType = 'network' | 'parsing' | 'unavailable';

export interface FeedError {
  readonly type: FeedErrorType;
  readonly status?: number;
  readonly message: string;
}

export type AppScreen = 'home' | 'bookmarks' | 'search' | 'settings';
