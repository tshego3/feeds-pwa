import type { StreakSummary } from '../types';
import { addIdeasViewed, completeLesson, getAllLearningDays } from '../db';
import { getDailyGoal } from '../preferences';
import { computeStreak, toLocalDateKey } from './streak';

export interface TodayProgress {
  readonly ideasViewed: number;
  readonly goal: number;
  readonly streak: StreakSummary;
}

// True when this call completed the lesson and counted it toward today.
export function markLessonComplete(link: string): Promise<boolean> {
  return completeLesson(link, toLocalDateKey(new Date()), Date.now());
}

export function recordIdeasViewed(count: number): Promise<void> {
  return addIdeasViewed(toLocalDateKey(new Date()), count, getDailyGoal(), Date.now());
}

export async function getStreakSummary(): Promise<StreakSummary> {
  return (await getTodayProgress()).streak;
}

export async function getTodayProgress(): Promise<TodayProgress> {
  const days = await getAllLearningDays();
  const todayKey = toLocalDateKey(new Date());
  const goal = getDailyGoal();
  return {
    ideasViewed: days.find((day) => day.date === todayKey)?.ideasViewed ?? 0,
    goal,
    streak: computeStreak(days, todayKey, goal),
  };
}
