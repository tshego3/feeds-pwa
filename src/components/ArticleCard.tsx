import { Card, Image, Text, Box } from '@mantine/core';
import type { FeedItem } from '../types';
import { tokens } from '../theme';

interface ArticleCardProps {
  readonly article: FeedItem;
  readonly onSelect: (article: FeedItem) => void;
  readonly suppressHeroImage?: boolean;
}

export function ArticleCard({ article, onSelect, suppressHeroImage }: ArticleCardProps) {
  const imageUrl = suppressHeroImage ? undefined : article.imageUrls[0];

  return (
    <Card
      padding="md"
      radius="lg"
      onClick={() => onSelect(article)}
      style={{
        cursor: 'pointer',
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.border}`,
        transition: 'transform 0.1s ease',
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      {imageUrl && (
        <Card.Section>
          <Image src={imageUrl} alt={article.title} h={180} fit="cover" />
        </Card.Section>
      )}
      <Text size="sm" fw={600} c={tokens.textPrimary} lineClamp={2} mt={imageUrl ? 'sm' : 0}>
        {article.title}
      </Text>
      <Text size="xs" c={tokens.textSecondary} lineClamp={2} mt={4}>
        {article.description}
      </Text>
      <Text size="xs" c={tokens.textSecondary} mt={8}>
        {article.pubDate.substring(0, 16)}
      </Text>
    </Card>
  );
}

interface CompactArticleRowProps {
  readonly article: FeedItem;
  readonly onSelect: (article: FeedItem) => void;
}

export function CompactArticleRow({ article, onSelect }: CompactArticleRowProps) {
  return (
    <Box
      onClick={() => onSelect(article)}
      style={{
        cursor: 'pointer',
        padding: '12px 16px',
        borderBottom: `1px solid ${tokens.border}`,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}
    >
      {article.imageUrls[0] && (
        <Image
          src={article.imageUrls[0]}
          alt=""
          w={80}
          h={60}
          radius="sm"
          fit="cover"
          style={{ flexShrink: 0 }}
        />
      )}
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={500} c={tokens.textPrimary} lineClamp={1}>
          {article.title}
        </Text>
        <Text size="xs" c={tokens.textSecondary} mt={2}>
          {article.pubDate.substring(0, 16)}
        </Text>
      </Box>
    </Box>
  );
}
