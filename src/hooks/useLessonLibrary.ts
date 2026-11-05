import { useCallback, useEffect, useState } from 'react';
import type { FeedItem, Lesson } from '../types';
import { listLessons, listSuggestions } from '../learning';
import { toUserMessage } from './useLesson';

// refreshKey: bump it after a lesson completes to reload the lists.
export function useLessonLibrary(refreshKey: number) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [suggestions, setSuggestions] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [lessonList, suggestionList] = await Promise.all([listLessons(), listSuggestions()]);
        if (!active) return;
        // Book summaries have their own Library panel.
        setLessons(lessonList.filter((lesson) => lesson.kind !== 'book'));
        setSuggestions(suggestionList);
      } catch (err) {
        if (active) setErrorMessage(toUserMessage(err));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [refreshKey, reloadCount]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  // Derived each render, never stored.
  const inProgress = lessons.filter((lesson) => lesson.completedAt === undefined);
  const completed = lessons.filter((lesson) => lesson.completedAt !== undefined);
  const hasItems = lessons.length > 0 || suggestions.length > 0;

  return { inProgress, completed, suggestions, hasItems, isLoading, errorMessage, reload };
}
