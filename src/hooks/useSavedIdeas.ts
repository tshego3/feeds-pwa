import { useCallback, useEffect, useState } from 'react';
import type { SavedIdea } from '../types';
import { listSavedIdeas, removeSavedIdea } from '../learning';
import { toUserMessage } from './useLesson';

export function useSavedIdeas(refreshKey: number) {
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const list = await listSavedIdeas();
        if (active) setIdeas(list);
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

  const remove = useCallback(async (id: string) => {
    await removeSavedIdea(id);
    setIdeas((current) => current.filter((idea) => idea.id !== id));
  }, []);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  return { ideas, isLoading, errorMessage, remove, reload };
}
