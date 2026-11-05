import { useState, useEffect, useCallback } from 'react';
import type { AppScreen } from '../types';

const VALID_SCREENS: readonly AppScreen[] = ['for-you', 'feeds', 'explore', 'library', 'search', 'settings'];
const DEFAULT_SCREEN: AppScreen = 'for-you';

// Hashes from earlier versions: the RSS dashboard became the Feeds tab, and
// the Learn and Bookmarks tabs merged into Library.
const LEGACY_SCREENS: Readonly<Record<string, AppScreen>> = {
  home: 'feeds',
  learn: 'library',
  bookmarks: 'library',
};

function isAppScreen(value: string): value is AppScreen {
  return VALID_SCREENS.some((screen) => screen === value);
}

function getScreenFromHash(): AppScreen {
  const hash = window.location.hash.replace('#', '');
  if (isAppScreen(hash)) return hash;
  const legacy = LEGACY_SCREENS[hash];
  if (legacy) {
    // Replace rather than push, so Back does not bounce through the old hash.
    history.replaceState(null, '', `#${legacy}`);
    return legacy;
  }
  return DEFAULT_SCREEN;
}

export function useRouter() {
  const [screen, setScreenState] = useState<AppScreen>(getScreenFromHash);

  useEffect(() => {
    function onHashChange() {
      setScreenState(getScreenFromHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((target: AppScreen) => {
    window.location.hash = target;
  }, []);

  return { screen, navigate };
}
