import type { LearningDay, StreakSummary } from '../types';

const MS_PER_DAY = 86_400_000;
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Local calendar day as YYYY-MM-DD: a streak follows the user's own midnight.
export function toLocalDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Whole-day number for a date key. UTC math keeps every day exactly 24 hours,
// so a daylight-saving change cannot open a gap in a streak.
export function dayNumber(dateKey: string): number | null {
  const match = DATE_KEY.exec(dateKey);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  const time = Date.UTC(y, m - 1, d);
  // Reject keys like 2026-02-31 that Date.UTC silently rolls over.
  if (toUtcKey(time) !== dateKey) return null;
  return time / MS_PER_DAY;
}

// A day is active when a lesson was completed or, when a daily goal is given,
// when the ideas viewed that day reached the goal stored with the day (the
// given goal for older records that carry none).
export function isActiveDay(day: LearningDay, goal?: number): boolean {
  if (day.lessonsCompleted > 0) return true;
  if (goal === undefined) return false;
  const target = day.goal ?? goal;
  return target > 0 && (day.ideasViewed ?? 0) >= target;
}

export function computeStreak(days: readonly LearningDay[], todayKey: string, goal?: number): StreakSummary {
  const today = dayNumber(todayKey);
  const active = [
    ...new Set(
      days
        // Today follows the current goal; past days keep the goal they had.
        .filter((day) => isActiveDay(day.date === todayKey ? { ...day, goal: undefined } : day, goal))
        .map((day) => dayNumber(day.date))
        .filter((n): n is number => n !== null),
    ),
  ].sort((a, b) => a - b);
  if (today === null || active.length === 0) return { current: 0, longest: 0, activeToday: false };

  const activeSet = new Set(active);
  const activeToday = activeSet.has(today);
  // Yesterday's streak stays alive until today ends.
  const end = activeToday ? today : today - 1;
  return {
    current: runEndingAt(activeSet, end, active.length),
    longest: longestRun(active),
    activeToday,
  };
}

function runEndingAt(activeSet: ReadonlySet<number>, end: number, limit: number): number {
  let count = 0;
  while (count < limit && activeSet.has(end - count)) count += 1;
  return count;
}

function longestRun(sorted: readonly number[]): number {
  let longest = 0;
  let run = 0;
  sorted.forEach((n, i) => {
    run = i > 0 && n === (sorted[i - 1] ?? NaN) + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  return longest;
}

function toUtcKey(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}
