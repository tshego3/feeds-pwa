import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { theme } from './theme';
import { App } from './App';
import './global.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <App />
      </MantineProvider>
    </StrictMode>,
  );
}

// Register service worker (built by vite-plugin-pwa)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);

      // Register periodic background sync (Chromium only, requires PWA install)
      if ('periodicSync' in registration) {
        try {
          const periodicSync = registration as ServiceWorkerRegistration & {
            periodicSync: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
          };
          await periodicSync.periodicSync.register('refresh-feeds', {
            minInterval: 15 * 60 * 1000, // 15 minutes
          });
        } catch {
          // Periodic sync not granted or not supported — foreground refresh is the fallback
        }
      }
    } catch {
      // SW registration failed - app still works without it
    }
  });
}
