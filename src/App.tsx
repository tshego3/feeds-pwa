import { useState, useEffect, useCallback } from 'react';
import { AppShell, Box, UnstyledButton, Text, Overlay, ScrollArea } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconHome, IconSearch, IconBookmark, IconSettings, IconMenu2 } from '@tabler/icons-react';
import type { RssFeedModel, FeedMenuItem, FeedItem, AppScreen } from './types';
import { tokens } from './theme';
import { getAllSubscriptions, isDbEmpty, seedSubscriptions, cacheArticles, getArticlesByFeed } from './db';
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

  // Silent refresh: fetches feed without loading state, shows banner if new articles found
  const silentRefresh = useCallback(async () => {
    if (!selectedFeed) return;
    try {
      const xml = await fetchFeedXml(selectedFeed.url);
      const parsed = parseRssXml(xml, selectedFeed.id);
      const existingIds = new Set(articles.map((a) => a.id));
      const newItems = parsed.filter((p) => !existingIds.has(p.id));
      if (newItems.length > 0) {
        setArticles(parsed);
        setNewArticleCount(newItems.length);
        await cacheArticles(parsed);
      }
    } catch {
      // Silent refresh failures are ignored
    }
  }, [selectedFeed, articles]);

  // Pull-to-refresh
  const { pulling, refreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh({
    onRefresh: silentRefresh,
  });

  // Auto-refresh every 15 minutes
  useAutoRefresh(silentRefresh, screen === 'home' && selectedFeed !== null);

  // Load subscriptions on mount
  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
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

    // Select first feed
    if (subs.length > 0 && subs[0]) {
      selectFeed(subs[0]);
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
      navbar={isDesktop ? { width: 260, breakpoint: 'sm' } : undefined}
      style={{ backgroundColor: tokens.background }}
    >
      {isDesktop && (
        <AppShell.Navbar
          style={{
            backgroundColor: tokens.surface,
            borderRight: `1px solid ${tokens.border}`,
          }}
        >
          <Box p="md">
            <Text size="lg" fw={700} c={tokens.textPrimary}>
              feeds
            </Text>
          </Box>
          <FeedSidebar
            menuItems={menuItems}
            selectedFeedId={selectedFeed?.id ?? null}
            onSelectFeed={selectFeed}
          />
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
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: `1px solid ${tokens.border}`,
              backgroundColor: tokens.surface,
            }}
          >
            <UnstyledButton onClick={() => setShowMobileDrawer(true)}>
              <IconMenu2 size={22} color={tokens.textPrimary} stroke={1.5} />
            </UnstyledButton>
            <Text size="md" fw={600} c={tokens.textPrimary} lineClamp={1} style={{ flex: 1 }}>
              {selectedFeed?.title ?? 'feeds'}
            </Text>
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
              color="#000"
              onClick={() => setShowMobileDrawer(false)}
              style={{ position: 'absolute', inset: 0, zIndex: 0 }}
            />
            <Box
              style={{
                position: 'relative',
                zIndex: 1,
                width: 280,
                height: '100%',
                backgroundColor: tokens.surface,
                borderRight: `1px solid ${tokens.border}`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box p="md" style={{ borderBottom: `1px solid ${tokens.border}` }}>
                <Text size="lg" fw={700} c={tokens.textPrimary}>
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

        {newArticleCount > 0 && (
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
            suppressHeroImage={selectedFeed?.suppressHeroImage ?? false}
            onSelectArticle={handleSelectArticle}
            onRetry={() => selectedFeed && selectFeed(selectedFeed)}
          />
        )}
        {screen === 'search' && <SearchScreen onSelectArticle={handleSelectArticle} />}
        {screen === 'bookmarks' && <BookmarksScreen onSelectArticle={handleSelectArticle} />}
        {screen === 'settings' && <SettingsScreen />}
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
            backgroundColor: tokens.surface,
            borderTop: `1px solid ${tokens.border}`,
            zIndex: 100,
          }}
        >
          {tabs.map((tab) => (
            <UnstyledButton
              key={tab.id}
              onClick={() => navigate(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0',
                color: screen === tab.id ? tokens.accent : tokens.textSecondary,
              }}
            >
              <tab.icon size={20} stroke={1.5} />
              <Text size="xs" mt={2}>
                {tab.label}
              </Text>
            </UnstyledButton>
          ))}
        </Box>
      )}
    </AppShell>
  );
}
