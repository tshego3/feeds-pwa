import { useEffect, useRef } from 'react';

const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useAutoRefresh(onRefresh: () => Promise<void>, enabled: boolean) {
  // Keep the latest callback in a ref so the interval always calls the
  // current closure instead of the one captured when it was first started.
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const lastRefreshRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      lastRefreshRef.current = Date.now();
      void onRefreshRef.current();
    };

    const id = setInterval(refresh, AUTO_REFRESH_INTERVAL);

    // Background tabs get their timers throttled, and a backgrounded PWA is
    // frozen outright, so the interval alone can leave the list stale for far
    // longer than 15 minutes after the user comes back. Catch up on resume.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefreshRef.current < AUTO_REFRESH_INTERVAL) return;
      refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}
