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

export type AppScreen = 'for-you' | 'feeds' | 'explore' | 'library' | 'search' | 'settings';

// Micro-learning

export type SummarySource = 'extractive' | 'on-device';

export interface LessonCard {
  readonly index: number;
  readonly text: string;
}

export interface Lesson {
  readonly link: string;
  readonly feedId: number;
  readonly title: string;
  readonly feedTitle: string;
  readonly imageUrl?: string;
  readonly summary: readonly string[];
  readonly summarySource: SummarySource;
  readonly cards: readonly LessonCard[];
  readonly wordCount: number;
  readonly readMinutes: number;
  readonly createdAt: number;
  readonly completedAt?: number;
  /** Missing on v1 records, which are all article lessons. */
  readonly kind?: LessonKind;
  readonly author?: string;
  readonly quotes?: readonly string[];
}

export type LessonKind = 'article' | 'book';

/** What the lesson view needs to load or build a lesson for one article. */
export interface LessonRequest {
  readonly link: string;
  readonly feedId: number;
  readonly title: string;
  readonly feedTitle: string;
  readonly description: string;
  readonly imageUrl?: string;
  /** Set when the lesson is a book summary rather than an article. */
  readonly book?: BookRef;
}

export interface LearningDay {
  /** Local calendar day, YYYY-MM-DD. */
  readonly date: string;
  readonly lessonsCompleted: number;
  readonly ideasViewed?: number;
  /** Daily goal in force when ideas were last counted; missing on older records. */
  readonly goal?: number;
  readonly updatedAt: number;
}

export interface StreakSummary {
  readonly current: number;
  readonly longest: number;
  readonly activeToday: boolean;
}

export type LessonErrorType = 'network' | 'extraction' | 'too-short';

export interface LessonError {
  readonly type: LessonErrorType;
  readonly message: string;
}

export type SpeechStatus = 'idle' | 'speaking' | 'paused' | 'unsupported';

export type SpeechRate = 0.75 | 1 | 1.25 | 1.5;

// Learning feed

export type InterestId =
  | 'philosophy'
  | 'psychology'
  | 'success'
  | 'leadership'
  | 'money'
  | 'science'
  | 'health'
  | 'society';

export interface InterestSource {
  readonly id: InterestId;
  readonly title: string;
  readonly wikiCategories: readonly string[];
  readonly triviaCategories: readonly number[];
}

export interface BookRef {
  readonly gutenbergId: number;
  readonly title: string;
  readonly author: string;
  readonly interest: InterestId;
  /** Wikipedia language editions linked from Wikidata; 0 when unknown. */
  readonly sitelinks: number;
}

export interface BookCatalog {
  readonly generatedAt: string;
  readonly catalogDate: string;
  readonly interests: Readonly<Record<InterestId, readonly BookRef[]>>;
}

export interface TopicSummary {
  readonly title: string;
  readonly extract: string;
  readonly thumbnailUrl?: string;
  readonly pageUrl: string;
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  readonly id: string;
  readonly question: string;
  readonly correct: string;
  readonly options: readonly string[];
  readonly difficulty: QuizDifficulty;
  readonly categoryName: string;
}

export type SavedIdeaKind = 'book-idea' | 'topic' | 'quote' | 'article' | 'quiz';

export interface SavedIdea {
  readonly id: string;
  readonly kind: SavedIdeaKind;
  readonly text: string;
  readonly sourceTitle: string;
  readonly sourceLink: string;
  readonly imageUrl?: string;
  readonly savedAt: number;
  /** Index into the review schedule; 0 before the first review. */
  readonly reviewStep: number;
  /** Epoch ms of the next review; null once the idea is retired. */
  readonly reviewDueAt: number | null;
}

interface CardBase {
  readonly id: string;
}

export type FeedCard =
  | (CardBase & { readonly kind: 'article'; readonly article: FeedItem; readonly feedTitle: string })
  | (CardBase & { readonly kind: 'book-idea'; readonly book: BookRef; readonly idea: LessonCard; readonly total: number })
  | (CardBase & { readonly kind: 'topic'; readonly topic: TopicSummary; readonly interest: InterestId })
  | (CardBase & { readonly kind: 'quote'; readonly text: string; readonly book: BookRef })
  | (CardBase & { readonly kind: 'quiz'; readonly quiz: QuizQuestion })
  | (CardBase & { readonly kind: 'daily'; readonly topic: TopicSummary; readonly label: string })
  | (CardBase & { readonly kind: 'review'; readonly idea: SavedIdea })
  | (CardBase & {
      readonly kind: 'goal';
      readonly ideasViewed: number;
      readonly goal: number;
      readonly streak: StreakSummary;
    })
  | (CardBase & { readonly kind: 'end' });

export type FeedCardKind = FeedCard['kind'];

export interface CachedBody {
  readonly url: string;
  readonly fetchedAt: number;
  readonly body: string;
}

export interface SeenCard {
  readonly cardId: string;
  readonly seenAt: number;
}

export interface BookWorkerRequest {
  readonly type: 'build';
  readonly id: number;
  readonly title: string;
  readonly text: string;
}

export type BookWorkerResponse =
  | {
      readonly type: 'built';
      readonly id: number;
      readonly ideas: readonly LessonCard[];
      readonly summary: readonly string[];
      readonly quotes: readonly string[];
      readonly wordCount: number;
    }
  | { readonly type: 'error'; readonly id: number; readonly message: string };
