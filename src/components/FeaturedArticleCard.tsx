import { Card, Image, Text, Overlay, Box } from '@mantine/core';
import type { FeedItem } from '../types';
import { tokens } from '../theme';

interface FeaturedArticleCardProps {
  readonly article: FeedItem;
  readonly onSelect: (article: FeedItem) => void;
}

export function FeaturedArticleCard({ article, onSelect }: FeaturedArticleCardProps) {
  const imageUrl = article.imageUrls[0];

  return (
    <Card
      padding={0}
      radius="lg"
      onClick={() => onSelect(article)}
      style={{
        cursor: 'pointer',
        backgroundColor: tokens.surface,
        position: 'relative',
        overflow: 'hidden',
        height: 380,
      }}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt={article.title} h={380} fit="cover" />
      ) : (
        <Box style={{ height: 380, backgroundColor: tokens.elevated }} />
      )}
      <Overlay
        gradient="linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 60%)"
        zIndex={1}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          zIndex: 2,
        }}
      >
        <Text size="lg" fw={600} c={tokens.textPrimary} lineClamp={2}>
          {article.title}
        </Text>
        <Text size="xs" c={tokens.textSecondary} mt={4}>
          {article.pubDate.substring(0, 16)}
        </Text>
      </Box>
    </Card>
  );
}
