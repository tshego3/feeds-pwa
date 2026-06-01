import { useState, useEffect, useCallback } from 'react';
import type { AppScreen } from '../types';

const VALID_SCREENS: readonly AppScreen[] = ['home', 'bookmarks', 'search', 'settings'];

function getScreenFromHash(): AppScreen {
  const hash = window.location.hash.replace('#', '');
  return VALID_SCREENS.includes(hash as AppScreen) ? (hash as AppScreen) : 'home';
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
