import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import type { FeedItem } from '../types';
import { getAllArticles } from '../db';
import { LoadingSkeleton, EmptyState } from '../components/StateViews';
import { tokens } from '../theme';
import { useResolvedImage } from '../hooks/useResolvedImage';

const MAX_RECENT = 10;
const STORAGE_KEY = 'feeds-recent-searches';

interface SearchScreenProps {
  readonly onSelectArticle: (article: FeedItem) => void;
}

export function SearchScreen({ onSelectArticle }: SearchScreenProps) {
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) as string[] : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    getAllArticles()
      .then(setArticles)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchText.trim()) return [];
    const query = searchText.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query),
    );
  }, [articles, searchText]);

  const commitSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    setRecentSearches((prev) => {
      const next = [term, ...prev.filter((s) => s !== term)].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && searchText.trim()) {
      commitSearch(searchText.trim());
    }
  }

  function removeRecent(term: string) {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clearAllRecent() {
    setRecentSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function selectRecent(term: string) {
    setSearchText(term);
  }

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <Box style={{ padding: '32px 24px 0' }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: tokens.primary,
          }}
        >
          Search
        </Text>
      </Box>

      {/* Search field (glass panel) */}
      <Box style={{ padding: '32px 24px 0' }}>
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 20,
            backgroundColor: tokens.surfaceContainerLow,
            borderRadius: 12,
            border: `1px solid ${tokens.outlineVariant}`,
          }}
        >
          <IconSearch size={18} color={tokens.outline} />
          <input
            type="text"
            placeholder="Search articles, sources, or topics..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: tokens.primary,
              fontFamily: 'inherit',
            }}
          />
          {searchText && (
            <UnstyledButton onClick={() => setSearchText('')} style={{ color: tokens.outline }}>
              <IconX size={16} />
            </UnstyledButton>
          )}
        </Box>
      </Box>

      {/* Recent searches */}
      {!searchText && recentSearches.length > 0 && (
        <Box style={{ padding: '32px 24px 0' }}>
          <Box style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: tokens.onSurfaceVariant,
                opacity: 0.5,
                textTransform: 'uppercase',
                flex: 1,
              }}
            >
              Recent Searches
            </Text>
            <UnstyledButton
              onClick={clearAllRecent}
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: tokens.primary,
                textTransform: 'uppercase',
              }}
            >
              Clear All
            </UnstyledButton>
          </Box>
          <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recentSearches.map((term) => (
              <Box
                key={term}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  backgroundColor: `${tokens.secondaryContainer}4D`,
                  border: `1px solid ${tokens.outlineVariant}`,
                  borderRadius: 999,
                  cursor: 'pointer',
                }}
                onClick={() => selectRecent(term)}
              >
                <Text style={{ fontSize: 13, color: tokens.onSurfaceVariant }}>{term}</Text>
                <UnstyledButton
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecent(term);
                  }}
                  style={{ color: tokens.outline, display: 'flex' }}
                >
                  <IconX size={12} />
                </UnstyledButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Results */}
      {searchText && (
        <Box style={{ padding: '32px 24px 0' }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.02em',
              color: tokens.onSurfaceVariant,
              opacity: 0.5,
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Articles ({filteredArticles.length})
          </Text>

          {filteredArticles.length === 0 ? (
            <EmptyState message="No articles match your search." />
          ) : (
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredArticles.map((article) => (
                <SearchResultRow key={article.id} article={article} onSelect={onSelectArticle} />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

interface SearchResultRowProps {
  readonly article: FeedItem;
  readonly onSelect: (article: FeedItem) => void;
}

function SearchResultRow({ article, onSelect }: SearchResultRowProps) {
  const imageUrl = useResolvedImage(article);
  const formattedDate = formatDate(article.pubDate);

  return (
    <Box
      onClick={() => onSelect(article)}
      style={{
        display: 'flex',
        gap: 16,
        padding: 16,
        backgroundColor: tokens.surfaceContainerLow,
        borderRadius: 12,
        border: `1px solid ${tokens.outlineVariant}4D`,
        cursor: 'pointer',
      }}
    >
      <Box style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: tokens.onSurfaceVariant,
            textTransform: 'uppercase',
          }}
        >
          {formattedDate}
        </Text>
        <Text
          lineClamp={2}
          style={{ fontSize: 15, fontWeight: 500, color: tokens.primary, lineHeight: 1.4 }}
        >
          {article.title}
        </Text>
        {article.description && (
          <Text
            lineClamp={1}
            style={{ fontSize: 13, color: tokens.onSurfaceVariant }}
          >
            {article.description}
          </Text>
        )}
      </Box>
      {imageUrl && (
        <Box
          style={{
            width: 80,
            height: 60,
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0)' }}
          />
        </Box>
      )}
    </Box>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr.substring(0, 16);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr.substring(0, 16);
  }
}
