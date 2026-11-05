import { useCallback, useEffect, useState } from 'react';
import type { Lesson } from '../types';
import { listBuiltBooks } from '../learning';
import { toUserMessage } from './useLesson';

// Book summaries already built on this device, newest first.
export function useLibraryBooks(refreshKey: number) {
  const [books, setBooks] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const list = await listBuiltBooks();
        if (active) setBooks(list);
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
  return { books, isLoading, errorMessage, reload };
}
