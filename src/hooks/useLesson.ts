import { useCallback, useEffect, useState } from 'react';
import type { Lesson, LessonError, LessonRequest } from '../types';
import { getOrCreateLesson, markLessonComplete } from '../learning';

export function useLesson(request: LessonRequest) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      setLesson(null);
      try {
        const result = await getOrCreateLesson(request);
        if (active) setLesson(result);
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
    // The link identifies the lesson; other request fields only seed it.
  }, [request.link, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Resolves true when this call counted the lesson toward today's streak.
  const markComplete = useCallback(async (): Promise<boolean> => {
    if (!lesson || lesson.completedAt !== undefined) return false;
    const counted = await markLessonComplete(lesson.link);
    setLesson({ ...lesson, completedAt: Date.now() });
    return counted;
  }, [lesson]);

  return { lesson, isLoading, errorMessage, retry, markComplete };
}

export function toUserMessage(err: unknown): string {
  if (isLessonError(err)) return err.message;
  if (err instanceof TypeError) return 'Network error. Please check your connection.';
  return 'Something went wrong. Please try again.';
}

function isLessonError(value: unknown): value is LessonError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { readonly type?: unknown; readonly message?: unknown };
  return (
    (candidate.type === 'network' || candidate.type === 'extraction' || candidate.type === 'too-short') &&
    typeof candidate.message === 'string'
  );
}
