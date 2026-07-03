import { useEffect, useRef } from 'react';

const positions = new Map<string, number>();

// Remembers window scroll position per key (e.g. feed id) so switching
// between feeds and back restores where the user left off.
export function useScrollRestoration(key: string | null, ready: boolean) {
  const activeKey = useRef<string | null>(null);
  const restored = useRef(false);

  // Capture the outgoing key's position synchronously during render — waiting
  // for an effect is too late, because once React commits shorter content the
  // browser clamps scrollY toward 0 before effects run.
  if (key !== activeKey.current) {
    if (activeKey.current !== null && restored.current) {
      positions.set(activeKey.current, window.scrollY);
    }
    activeKey.current = key;
    restored.current = false;
  }

  useEffect(() => {
    if (!ready || key === null || restored.current) return;
    window.scrollTo(0, positions.get(key) ?? 0);
    restored.current = true;
  }, [key, ready]);

  // Track the position live, but only after restoration — scroll events fired
  // by the browser clamping during a content swap must not overwrite the
  // stored position.
  useEffect(() => {
    function saveCurrent() {
      if (activeKey.current !== null && restored.current) {
        positions.set(activeKey.current, window.scrollY);
      }
    }
    window.addEventListener('scroll', saveCurrent, { passive: true });
    window.addEventListener('beforeunload', saveCurrent);
    return () => {
      window.removeEventListener('scroll', saveCurrent);
      window.removeEventListener('beforeunload', saveCurrent);
    };
  }, []);
}
