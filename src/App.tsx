import { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell, Box, UnstyledButton, Text, Overlay, ScrollArea } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconHome, IconSearch, IconBookmark, IconSettings, IconMenu2 } from '@tabler/icons-react';
import type { RssFeedModel, FeedMenuItem, FeedItem, AppScreen } from './types';
import { tokens } from './theme';
import { getAllSubscriptions, isDbEmpty, seedSubscriptions, cacheArticles, getArticlesByFeed, pruneExpiredArticles } from './db';
import { fetchFeedXml, parseRssXml } from './feed';
import { FeedSidebar } from './components/FeedSidebar';
import { Dashboard } from './screens/Dashboard';
import { ArticleReading } from './screens/ArticleReading';
import { SearchScreen } from './screens/Search';
import { BookmarksScreen } from './screens/Bookmarks';
import { SettingsScreen } from './screens/Settings';
import { NewArticlesBanner } from './components/NewArticlesBanner';
import { useRouter } from './hooks/useRouter';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import {
  showNewArticlesNotification,
  getNotificationPreference,
  isNotificationSupported,
} from './notifications';
import { subscribeToPush } from './notifications/push';
import {
  getAutoRefreshPreference,
  setAutoRefreshPreference,
  getShowImagesPreference,
  setShowImagesPreference,
  getLastFeedId,
  setLastFeedId,
} from './preferences';

export function App() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { screen, navigate } = useRouter();

  const [menuItems, setMenuItems] = useState<FeedMenuItem[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<RssFeedModel | null>(null);
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readingArticle, setReadingArticle] = useState<FeedItem | null>(null);
  const [newArticleCount, setNewArticleCount] = useState(0);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => getAutoRefreshPreference());
  const [showImages, setShowImages] = useState(() => getShowImagesPreference());

  // Shared silent-refresh pipeline: fetch → parse → diff against the cache →
  // persist → update the visible list and notify when something is new.
  const refreshFeed = useCallback(
    async (feed: RssFeedModel) => {
      const xml = await fetchFeedXml(feed.url);
      const parsed = parseRssXml(xml, feed.id);
      const cached = await getArticlesByFeed(feed.id);
      const cachedIds = new Set(cached.map((a) => a.id));
      const newItems = parsed.filter((p) => !cachedIds.has(p.id));
      await cacheArticles(parsed);
      if (newItems.length === 0) return;
      if (feed.id === selectedFeed?.id) {
        setArticles(parsed);
        setNewArticleCount(newItems.length);
      }
      await showNewArticlesNotification(feed.title, newItems.length);
    },
    [selectedFeed],
  );

  // Pull-to-refresh (selected feed only — fast, user-visible)
  const silentRefresh = useCallback(async () => {
    if (!selectedFeed) return;
    try {
      await refreshFeed(selectedFeed);
    } catch {
      // Silent refresh failures are ignored
    }
  }, [selectedFeed, refreshFeed]);

  const { pulling, refreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh({
    onRefresh: silentRefresh,
  });

  // Auto-refresh sweeps every subscription so all categories stay fresh and
  // can notify, not just the currently open feed. Bounded concurrency keeps
  // a large subscription list from serializing into a minutes-long sweep
  // without hammering the proxy.
  const refreshAllFeeds = useCallback(async () => {
    const subs = await getAllSubscriptions();
    const concurrency = 4;
    for (let i = 0; i < subs.length; i += concurrency) {
      await Promise.all(
        subs.slice(i, i + concurrency).map((feed) => refreshFeed(feed).catch(() => undefined)),
      );
    }
  }, [refreshFeed]);

  // Auto-refresh every 15 minutes, gated by the user's Settings toggle
  useAutoRefresh(refreshAllFeeds, autoRefreshEnabled && menuItems.length > 0);

  // Restore scroll position when returning to a previously-viewed feed
  useScrollRestoration(
    screen === 'home' && selectedFeed ? `home-${selectedFeed.id}` : null,
    !isLoading,
  );

  // Load subscriptions on mount. The ref guard keeps StrictMode's double-invoked
  // effect from running two concurrent seeds against an empty database.
  const configLoaded = useRef(false);
  useEffect(() => {
    if (configLoaded.current) return;
    configLoaded.current = true;
    void loadConfig().catch(() => {
      // Startup is best effort; a failure leaves the empty state on screen.
    });
  }, []);

  async function loadConfig() {
    void pruneExpiredArticles();

    const empty = await isDbEmpty();
    if (empty) {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}feeds.json`);
        const seedData = await res.json() as RssFeedModel[];
        await seedSubscriptions(seedData);
      } catch {
        // seed file unavailable
      }
    }

    const subs = await getAllSubscriptions();
    const items = buildMenuItems(subs);
    setMenuItems(items);

    // Keep the push worker's copy of the feed list current. Never prompt from
    // here: Safari requires Notification.requestPermission to come from a user
    // gesture, so the prompt lives behind the Settings toggle.
    if (
      isNotificationSupported() &&
      getNotificationPreference() &&
      Notification.permission === 'granted'
    ) {
      void subscribeToPush(subs.map((f) => f.url)).catch(() => {
        // Push is optional; foreground refresh still works without it.
      });
    }

    // Restore the last-viewed feed on cold start; fall back to the first feed
    const lastFeedId = getLastFeedId();
    const initialFeed = subs.find((f) => f.id === lastFeedId) ?? subs[0];
    if (initialFeed) {
      selectFeed(initialFeed);
    }
  }

  function buildMenuItems(feeds: RssFeedModel[]): FeedMenuItem[] {
    const groups = new Map<string, { title: string; feeds: RssFeedModel[] }>();
    const singles: FeedMenuItem[] = [];

    for (const feed of feeds) {
      if (feed.groupId && feed.groupTitle) {
        const existing = groups.get(feed.groupId);
        if (existing) {
          existing.feeds.push(feed);
        } else {
          groups.set(feed.groupId, { title: feed.groupTitle, feeds: [feed] });
        }
      } else {
        singles.push({ type: 'single', feed });
      }
    }

    const groupItems: FeedMenuItem[] = [...groups.entries()].map(([id, g]) => ({
      type: 'group',
      id,
      title: g.title,
      feeds: g.feeds,
    }));

    return [...singles, ...groupItems];
  }

  const selectFeed = useCallback(async (feed: RssFeedModel) => {
    setSelectedFeed(feed);
    setLastFeedId(feed.id);
    setShowMobileDrawer(false);
    navigate('home');
    setReadingArticle(null);
    setIsLoading(true);
    setErrorMessage(null);
    setArticles([]);

    try {
      const xml = await fetchFeedXml(feed.url);
      const parsed = parseRssXml(xml, feed.id);
      setArticles(parsed);
      await cacheArticles(parsed);
    } catch (err) {
      // Try cached articles first
      const cached = await getArticlesByFeed(feed.id);
      if (cached.length > 0) {
        setArticles(cached);
      } else {
        const feedError = err as { message?: string };
        setErrorMessage(feedError.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleSelectArticle(article: FeedItem) {
    setReadingArticle(article);
  }

  function handleBack() {
    setReadingArticle(null);
  }

  // Reading view takes over full screen
  if (readingArticle) {
    return (
      <ArticleReading
        article={readingArticle}
        feedTitle={selectedFeed?.title ?? 'Article'}
        onBack={handleBack}
      />
    );
  }

  const tabs: { id: AppScreen; icon: typeof IconHome; label: string }[] = [
    { id: 'home', icon: IconHome, label: 'Home' },
    { id: 'search', icon: IconSearch, label: 'Search' },
    { id: 'bookmarks', icon: IconBookmark, label: 'Bookmarks' },
    { id: 'settings', icon: IconSettings, label: 'Settings' },
  ];

  return (
    <AppShell
      navbar={isDesktop ? { width: 272, breakpoint: 'sm' } : undefined}
      style={{ backgroundColor: tokens.background }}
    >
      {isDesktop && (
        <AppShell.Navbar
          style={{
            backgroundColor: tokens.surfaceContainerLow,
            borderRight: `1px solid ${tokens.outlineVariant}`,
          }}
        >
          <Box style={{ padding: '32px 24px 24px' }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '-0.05em',
                color: tokens.primary,
              }}
            >
              feeds
            </Text>
          </Box>
          <ScrollArea style={{ flex: 1 }}>
            <FeedSidebar
              menuItems={menuItems}
              selectedFeedId={selectedFeed?.id ?? null}
              onSelectFeed={selectFeed}
            />
          </ScrollArea>
        </AppShell.Navbar>
      )}

      <AppShell.Main
        style={{ paddingBottom: isDesktop ? 0 : 60 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Mobile top bar with hamburger */}
        {!isDesktop && screen === 'home' && (
          <Box
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: `1px solid ${tokens.outlineVariant}`,
              backgroundColor: `${tokens.surface}CC`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <UnstyledButton onClick={() => setShowMobileDrawer(true)} style={{ color: tokens.primary }}>
              <IconMenu2 size={20} stroke={1.5} />
            </UnstyledButton>
            <Text
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: tokens.primary,
                flex: 1,
              }}
            >
              feeds
            </Text>
            <UnstyledButton onClick={() => navigate('search')} style={{ color: tokens.primary }}>
              <IconSearch size={20} stroke={1.5} />
            </UnstyledButton>
          </Box>
        )}

        {/* Mobile feed drawer overlay */}
        {!isDesktop && showMobileDrawer && (
          <Box
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              display: 'flex',
            }}
          >
            <Overlay
              opacity={0.4}
              color={tokens.background}
              onClick={() => setShowMobileDrawer(false)}
              style={{ position: 'absolute', inset: 0, zIndex: 0 }}
            />
            <Box
              style={{
                position: 'relative',
                zIndex: 1,
                width: 272,
                height: '100%',
                backgroundColor: tokens.surfaceContainerLow,
                borderRight: `1px solid ${tokens.outlineVariant}`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box style={{ padding: '32px 24px 24px', borderBottom: `1px solid ${tokens.outlineVariant}` }}>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    letterSpacing: '-0.05em',
                    color: tokens.primary,
                  }}
                >
                  feeds
                </Text>
              </Box>
              <ScrollArea style={{ flex: 1 }}>
                <FeedSidebar
                  menuItems={menuItems}
                  selectedFeedId={selectedFeed?.id ?? null}
                  onSelectFeed={selectFeed}
                />
              </ScrollArea>
            </Box>
          </Box>
        )}
        {(pulling || refreshing) && (
          <Box
            style={{
              textAlign: 'center',
              padding: 8,
              color: tokens.textSecondary,
              fontSize: 12,
            }}
          >
            {refreshing ? 'Refreshing...' : 'Release to refresh'}
          </Box>
        )}

        {screen === 'home' && newArticleCount > 0 && (
          <NewArticlesBanner
            count={newArticleCount}
            onDismiss={() => setNewArticleCount(0)}
          />
        )}

        {screen === 'home' && (
          <Dashboard
            items={articles}
            isLoading={isLoading}
            errorMessage={errorMessage}
            suppressHeroImage={(selectedFeed?.suppressHeroImage ?? false) || !showImages}
            feedTitle={selectedFeed?.title ?? 'All Articles'}
            onSelectArticle={handleSelectArticle}
            onRetry={() => selectedFeed && selectFeed(selectedFeed)}
          />
        )}
        {screen === 'search' && <SearchScreen onSelectArticle={handleSelectArticle} />}
        {screen === 'bookmarks' && <BookmarksScreen onSelectArticle={handleSelectArticle} />}
        {screen === 'settings' && (
          <SettingsScreen
            autoRefreshEnabled={autoRefreshEnabled}
            onToggleAutoRefresh={(enabled) => {
              setAutoRefreshEnabled(enabled);
              setAutoRefreshPreference(enabled);
            }}
            showImages={showImages}
            onToggleShowImages={(enabled) => {
              setShowImages(enabled);
              setShowImagesPreference(enabled);
            }}
          />
        )}
      </AppShell.Main>

      {/* Mobile bottom tabs */}
      {!isDesktop && (
        <Box
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            backgroundColor: `${tokens.surfaceContainerLow}CC`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: `1px solid ${tokens.outlineVariant}`,
            zIndex: 100,
            padding: '8px 0',
          }}
        >
          {tabs.map((tab) => {
            const isActive = screen === tab.id;
            return (
              <UnstyledButton
                key={tab.id}
                onClick={() => navigate(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '4px 12px',
                  color: isActive ? tokens.primary : tokens.onSurfaceVariant,
                }}
              >
                <Box
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 12px',
                    borderRadius: 12,
                    backgroundColor: isActive ? `${tokens.secondaryContainer}80` : 'transparent',
                  }}
                >
                  <tab.icon size={22} stroke={1.5} />
                </Box>
                <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginTop: 4 }}>
                  {tab.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Box>
      )}
    </AppShell>
  );
}
