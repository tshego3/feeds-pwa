import { useCallback } from 'react';
import { Box, SimpleGrid, Text } from '@mantine/core';
import type { FeedItem } from '../types';
import { FeaturedArticleCard } from '../components/FeaturedArticleCard';
import { ArticleCard, CompactArticleRow } from '../components/ArticleCard';
import { ErrorState, EmptyState, LoadingSkeleton } from '../components/StateViews';
import { tokens } from '../theme';

interface DashboardProps {
  readonly items: readonly FeedItem[];
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly suppressHeroImage: boolean;
  readonly feedTitle: string;
  readonly onSelectArticle: (article: FeedItem) => void;
  readonly onRetry: () => void;
}

export function Dashboard({
  items,
  isLoading,
  errorMessage,
  suppressHeroImage,
  feedTitle,
  onSelectArticle,
  onRetry,
}: DashboardProps) {
  const handleSelect = useCallback(
    (article: FeedItem) => onSelectArticle(article),
    [onSelectArticle],
  );

  // 4-branch rendering
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return <EmptyState message="No articles found. Select a feed to get started." />;
  }

  const featured = suppressHeroImage ? undefined : items[0];
  const gridStart = featured ? 1 : 0;
  const gridItems = items.slice(gridStart, gridStart + 6);
  const compactItems = items.slice(gridStart + 6);

  return (
    <Box style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <Box style={{ padding: '32px 24px' }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: tokens.primary,
          }}
        >
          {feedTitle}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: tokens.onSurfaceVariant,
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          {items.length} ARTICLE{items.length !== 1 ? 'S' : ''}
        </Text>
      </Box>

      {/* Featured article */}
      {featured && (
        <Box style={{ padding: '0 24px', marginBottom: 24 }}>
          <FeaturedArticleCard article={featured} onSelect={handleSelect} />
        </Box>
      )}

      {/* Secondary grid (2 columns) */}
      {gridItems.length > 0 && (
        <Box style={{ padding: '0 24px', marginBottom: 24 }}>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16}>
            {gridItems.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onSelect={handleSelect}
                suppressHeroImage={suppressHeroImage}
              />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Compact rows */}
      {compactItems.length > 0 && (
        <Box style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {compactItems.map((article) => (
            <CompactArticleRow key={article.id} article={article} onSelect={handleSelect} />
          ))}
        </Box>
      )}
    </Box>
  );
}
