import { useEffect, useRef } from 'react';

const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useAutoRefresh(onRefresh: () => Promise<void>, enabled: boolean) {
  // Keep the latest callback in a ref so the interval always calls the
  // current closure instead of the one captured when it was first started.
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      onRefreshRef.current();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [enabled]);
}
