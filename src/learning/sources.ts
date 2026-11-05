import type { InterestId, InterestSource } from '../types';

// Runtime source map for the learning feed. It holds API identifiers only,
// never content. Every Wikipedia category and trivia id below was checked by
// live request on 2026-11-05 (plan Section 6.1). Book lists come from the
// generated public/learning/books.json, not from here.
//
// Gutenberg's website is for human users only, so the app never requests
// www.gutenberg.org at runtime. Book text and covers come from its mirrors.

export const WIKI_API = 'https://en.wikipedia.org/w/api.php';
export const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1';
export const TRIVIA_API = 'https://opentdb.com';
export const API_USER_AGENT = 'feeds-pwa (https://tshego3.github.io/feeds-pwa/)';

// Tried in order. Neither sends CORS headers, so text goes through the proxy.
const BOOK_MIRRORS: readonly string[] = [
  'https://mirror.cs.odu.edu/gutenberg-epub/{id}/pg{id}.txt',
  'https://gutenberg.pglaf.org/cache/epub/{id}/pg{id}.txt',
];

const COVER_URL = 'https://mirror.cs.odu.edu/gutenberg-epub/{id}/pg{id}.cover.medium.jpg';

export const INTEREST_SOURCES: readonly InterestSource[] = [
  {
    id: 'philosophy',
    title: 'Philosophy',
    wikiCategories: ['Concepts_in_ethics', 'Stoicism'],
    triviaCategories: [],
  },
  {
    id: 'psychology',
    title: 'Psychology',
    wikiCategories: ['Cognitive_biases', 'Behavioral_concepts', 'Habits'],
    triviaCategories: [],
  },
  {
    id: 'success',
    title: 'Success & Productivity',
    wikiCategories: ['Time_management', 'Productivity', 'Learning_methods'],
    triviaCategories: [9],
  },
  {
    id: 'leadership',
    title: 'Leadership',
    wikiCategories: ['Leadership', 'Leadership_studies', 'Management'],
    triviaCategories: [23],
  },
  {
    id: 'money',
    title: 'Money',
    wikiCategories: ['Personal_finance', 'Investment', 'Financial_economics'],
    triviaCategories: [],
  },
  {
    id: 'science',
    title: 'Science',
    wikiCategories: ['Scientific_method', 'Concepts_in_physics', 'History_of_science'],
    triviaCategories: [17],
  },
  {
    id: 'health',
    title: 'Health',
    wikiCategories: ['Nutrition', 'Physical_exercise', 'Medical_terminology'],
    triviaCategories: [17],
  },
  {
    id: 'society',
    title: 'Society & Politics',
    wikiCategories: ['Political_concepts', 'Political_philosophy', 'Sociological_terminology', 'Government'],
    triviaCategories: [23, 24],
  },
];

export const INTEREST_IDS: readonly InterestId[] = INTEREST_SOURCES.map((s) => s.id);

export function isInterestId(value: unknown): value is InterestId {
  return typeof value === 'string' && INTEREST_IDS.some((id) => id === value);
}

export function sourceFor(id: InterestId): InterestSource | undefined {
  return INTEREST_SOURCES.find((s) => s.id === id);
}

export function mirrorTextUrls(gutenbergId: number): string[] {
  return BOOK_MIRRORS.map((template) => template.replaceAll('{id}', String(gutenbergId)));
}

export function coverUrl(gutenbergId: number): string {
  return COVER_URL.replaceAll('{id}', String(gutenbergId));
}
