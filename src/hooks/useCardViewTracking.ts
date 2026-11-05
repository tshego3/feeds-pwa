import { useEffect, useRef, useState, type RefObject } from 'react';

// Decision D12: a card counts as viewed after 1.5 s at 60% visibility.
export const VIEW_DWELL_MS = 1_500;
export const VIEW_THRESHOLD = 0.6;
const REPORT_EVERY_MS = 2_000;
// Status cards hold no content: never counted, never marked seen.
const STATUS_KINDS: ReadonlySet<string> = new Set(['goal', 'end']);

export interface CardViewCallbacks {
  /** Cards that reached 60% visibility at all. Feeds "seen", so no repeats. */
  readonly onShown: (cardIds: string[]) => void;
  /** Cards that stayed 1.5 s at 60%. Feeds the daily goal. */
  readonly onViewed: (cardIds: string[]) => void;
}

// Watches cards marked with data-card-id inside the scroll root. Returns the
// index (data-index) of the card in view, and reports shown and viewed card
// ids in batches. Each id is reported once per mount for each callback.
export function useCardViewTracking(rootRef: RefObject<HTMLElement | null>, cardCount: number, callbacks: CardViewCallbacks): number {
  const [activeIndex, setActiveIndex] = useState(0);
  const shown = useRef<Set<string>>(new Set());
  const viewed = useRef<Set<string>>(new Set());
  const pendingShown = useRef<string[]>([]);
  const pendingViewed = useRef<string[]>([]);
  const timers = useRef<Map<string, number>>(new Map());
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const flush = () => {
      const shownBatch = pendingShown.current;
      const viewedBatch = pendingViewed.current;
      pendingShown.current = [];
      pendingViewed.current = [];
      if (shownBatch.length > 0) callbacksRef.current.onShown(shownBatch);
      if (viewedBatch.length > 0) callbacksRef.current.onViewed(viewedBatch);
    };
    const interval = window.setInterval(flush, REPORT_EVERY_MS);
    return () => {
      window.clearInterval(interval);
      // Leaving the screen must not drop ids still waiting for a batch.
      flush();
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const timerMap = timers.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const id = el.dataset.cardId ?? '';
          if (entry.isIntersecting) {
            setActiveIndex(Number(el.dataset.index ?? 0));
            if (id !== '' && !STATUS_KINDS.has(el.dataset.cardKind ?? '')) track(id);
          } else {
            window.clearTimeout(timerMap.get(id));
            timerMap.delete(id);
          }
        }
      },
      { root, threshold: VIEW_THRESHOLD },
    );
    function track(id: string) {
      if (!shown.current.has(id)) {
        shown.current.add(id);
        pendingShown.current.push(id);
      }
      if (viewed.current.has(id) || timerMap.has(id)) return;
      timerMap.set(id, window.setTimeout(() => {
        timerMap.delete(id);
        viewed.current.add(id);
        pendingViewed.current.push(id);
      }, VIEW_DWELL_MS));
    }
    root.querySelectorAll<HTMLElement>('[data-card-id]').forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      timerMap.forEach((timer) => window.clearTimeout(timer));
      timerMap.clear();
    };
  }, [rootRef, cardCount]);

  return activeIndex;
}
