import { useCallback } from 'react';
import { Box, SimpleGrid } from '@mantine/core';
import type { FeedItem } from '../types';
import { FeaturedArticleCard } from '../components/FeaturedArticleCard';
import { ArticleCard, CompactArticleRow } from '../components/ArticleCard';
import { ErrorState, EmptyState, LoadingSkeleton } from '../components/StateViews';

interface DashboardProps {
  readonly items: readonly FeedItem[];
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly suppressHeroImage: boolean;
  readonly onSelectArticle: (article: FeedItem) => void;
  readonly onRetry: () => void;
}

export function Dashboard({
  items,
  isLoading,
  errorMessage,
  suppressHeroImage,
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

  const featured = items[0];
  const gridItems = items.slice(1, 5);
  const compactItems = items.slice(5);

  return (
    <Box p="md">
      {featured && !suppressHeroImage && (
        <Box mb="md">
          <FeaturedArticleCard article={featured} onSelect={handleSelect} />
        </Box>
      )}

      {gridItems.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
          {gridItems.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onSelect={handleSelect}
              suppressHeroImage={suppressHeroImage}
            />
          ))}
        </SimpleGrid>
      )}

      {compactItems.map((article) => (
        <CompactArticleRow key={article.id} article={article} onSelect={handleSelect} />
      ))}
    </Box>
  );
}
