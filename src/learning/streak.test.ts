import { describe, it, expect } from 'vitest';
import type { LearningDay } from '../types';
import { computeStreak, toLocalDateKey } from './streak';

function day(date: string, lessonsCompleted = 1): LearningDay {
  return { date, lessonsCompleted, updatedAt: 0 };
}

describe('toLocalDateKey', () => {
  it('pads month and day to two digits', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('computeStreak', () => {
  it('returns zeros when there are no days', () => {
    expect(computeStreak([], '2026-11-05')).toEqual({ current: 0, longest: 0, activeToday: false });
  });

  it('counts today and the two days before as a streak of three', () => {
    const days = [day('2026-11-03'), day('2026-11-04'), day('2026-11-05')];
    expect(computeStreak(days, '2026-11-05')).toEqual({ current: 3, longest: 3, activeToday: true });
  });

  it('keeps a streak that ended yesterday alive', () => {
    const days = [day('2026-11-03'), day('2026-11-04')];
    expect(computeStreak(days, '2026-11-05')).toEqual({ current: 2, longest: 2, activeToday: false });
  });

  it('resets the current count after a missed day', () => {
    const days = [day('2026-11-01'), day('2026-11-02'), day('2026-11-05')];
    expect(computeStreak(days, '2026-11-05').current).toBe(1);
  });

  it('keeps an older, longer run as the longest', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-11-05'].map((d) => day(d));
    expect(computeStreak(days, '2026-11-05')).toEqual({ current: 1, longest: 4, activeToday: true });
  });

  it('ignores days with no completed lessons', () => {
    const days = [day('2026-11-04', 0), day('2026-11-05')];
    expect(computeStreak(days, '2026-11-05').current).toBe(1);
  });

  it('stays unbroken across a daylight-saving change', () => {
    // Northern hemisphere DST ends on 2026-11-01 in the US and 2026-10-25 in the EU.
    const days = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-31', '2026-11-01', '2026-11-02'].map((d) => day(d));
    expect(computeStreak(days, '2026-11-02').current).toBe(3);
    expect(computeStreak(days, '2026-11-02').longest).toBe(3);
  });

  it('ignores malformed date keys', () => {
    const days = [day('not-a-date'), day('2026-02-31'), day('2026-11-05')];
    expect(computeStreak(days, '2026-11-05')).toEqual({ current: 1, longest: 1, activeToday: true });
  });
});

describe('computeStreak with a daily goal', () => {
  const day = (date: string, ideasViewed: number, lessonsCompleted = 0) => ({ date, lessonsCompleted, ideasViewed, updatedAt: 0 });

  it('counts a day whose ideas viewed meet the goal', () => {
    expect(computeStreak([day('2026-11-05', 10)], '2026-11-05', 10)).toEqual({ current: 1, longest: 1, activeToday: true });
  });

  it('does not count a day below the goal with no lessons', () => {
    expect(computeStreak([day('2026-11-05', 9)], '2026-11-05', 10).activeToday).toBe(false);
  });
});
