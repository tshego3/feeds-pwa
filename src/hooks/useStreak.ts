import { useCallback, useEffect, useState } from 'react';
import type { StreakSummary } from '../types';
import { getStreakSummary } from '../learning';

const EMPTY_STREAK: StreakSummary = { current: 0, longest: 0, activeToday: false };

// refreshKey: bump it after a lesson completes to reload the streak.
export function useStreak(refreshKey: number) {
  const [streak, setStreak] = useState<StreakSummary>(EMPTY_STREAK);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const summary = await getStreakSummary();
        if (active) setStreak(summary);
      } catch {
        if (active) setErrorMessage('Something went wrong. Please try again.');
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

  return { streak, isLoading, errorMessage, reload };
}
