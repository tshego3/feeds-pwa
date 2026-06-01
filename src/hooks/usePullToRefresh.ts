import { useRef, useCallback, useState } from 'react';

interface UsePullToRefreshOptions {
  readonly onRefresh: () => Promise<void>;
  readonly threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pullDistance = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop <= 0) {
      startY.current = e.touches[0]?.clientY ?? 0;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === 0) return;
    const currentY = e.touches[0]?.clientY ?? 0;
    const distance = currentY - startY.current;
    if (distance > 0) {
      pullDistance.current = distance;
      setPulling(distance >= threshold);
    }
  }, [threshold]);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance.current >= threshold && !refreshing) {
      setRefreshing(true);
      setPulling(false);
      await onRefresh();
      setRefreshing(false);
    }
    startY.current = 0;
    pullDistance.current = 0;
    setPulling(false);
  }, [threshold, onRefresh, refreshing]);

  return { pulling, refreshing, onTouchStart, onTouchMove, onTouchEnd };
}
