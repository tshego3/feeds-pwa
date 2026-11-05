import { useEffect, useState } from 'react';
import { DB_BLOCKED_EVENT, DB_READY_EVENT } from '../db';

// True while a database upgrade waits for another tab to close.
export function useDbUpgradeBlocked(): boolean {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const onBlocked = () => setBlocked(true);
    const onReady = () => setBlocked(false);
    window.addEventListener(DB_BLOCKED_EVENT, onBlocked);
    window.addEventListener(DB_READY_EVENT, onReady);
    return () => {
      window.removeEventListener(DB_BLOCKED_EVENT, onBlocked);
      window.removeEventListener(DB_READY_EVENT, onReady);
    };
  }, []);

  return blocked;
}
