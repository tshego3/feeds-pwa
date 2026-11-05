import type { SavedIdea } from '../types';

// Spaced repetition for saved ideas: review after 1, 3, then 7 days. A
// remembered idea moves up a step; a forgotten one starts over. After the
// last step the idea retires (reviewDueAt null) and stays in the Library.

export const REVIEW_DAYS: readonly number[] = [1, 3, 7];
const DAY_MS = 24 * 60 * 60 * 1000;

export function firstReviewDue(savedAt: number): number {
  return savedAt + (REVIEW_DAYS[0] ?? 1) * DAY_MS;
}

export function nextReview(idea: SavedIdea, remembered: boolean, now: number): SavedIdea {
  if (!remembered) return { ...idea, reviewStep: 0, reviewDueAt: now + (REVIEW_DAYS[0] ?? 1) * DAY_MS };
  const step = idea.reviewStep + 1;
  const days = REVIEW_DAYS[step];
  return { ...idea, reviewStep: step, reviewDueAt: days === undefined ? null : now + days * DAY_MS };
}
