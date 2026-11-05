import { describe, it, expect } from 'vitest';
import type { SavedIdea } from '../types';
import { firstReviewDue, nextReview } from './review';

const DAY = 24 * 60 * 60 * 1000;
const base: SavedIdea = { id: 'i', kind: 'topic', text: 't', sourceTitle: 's', sourceLink: 'l', savedAt: 0, reviewStep: 0, reviewDueAt: DAY };

describe('nextReview', () => {
  it('advances through 1, 3, and 7 days', () => {
    expect(firstReviewDue(0)).toBe(DAY);
    const second = nextReview(base, true, 0);
    expect(second.reviewDueAt).toBe(3 * DAY);
    expect(nextReview(second, true, 0).reviewDueAt).toBe(7 * DAY);
  });

  it('retires an idea remembered at the last step', () => {
    const last = { ...base, reviewStep: 2 };
    expect(nextReview(last, true, 0).reviewDueAt).toBeNull();
  });

  it('resets a forgotten idea to step 0', () => {
    const later = { ...base, reviewStep: 2 };
    expect(nextReview(later, false, 0)).toMatchObject({ reviewStep: 0, reviewDueAt: DAY });
  });
});
