import { useEffect, useRef, useCallback } from 'react';

const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useAutoRefresh(onRefresh: () => Promise<void>, enabled: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      onRefresh();
    }, AUTO_REFRESH_INTERVAL);
  }, [onRefresh]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    return stop;
  }, [enabled, start, stop]);
}
