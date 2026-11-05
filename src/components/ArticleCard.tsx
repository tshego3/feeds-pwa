import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import type { FeedItem } from '../types';
import { alpha, tokens } from '../theme';
import { useResolvedImage } from '../hooks/useResolvedImage';
import { ArticleImage, sourceLabel } from './ArticleImage';

interface ArticleCardProps {
  readonly article: FeedItem;
  readonly onSelect: (article: FeedItem) => void;
  readonly suppressHeroImage?: boolean;
  /** Feed name for the image placeholder when the article has no image. */
  readonly sourceTitle?: string;
  readonly isBookmarked?: boolean;
  readonly onToggleBookmark?: (article: FeedItem) => void;
}

export function ArticleCard({
  article,
  onSelect,
  suppressHeroImage,
  sourceTitle,
  isBookmarked,
  onToggleBookmark,
}: ArticleCardProps) {
  const imageUrl = useResolvedImage(article, suppressHeroImage);
  const formattedDate = formatDate(article.pubDate);

  return (
    <Box
      onClick={() => onSelect(article)}
      style={{
        cursor: 'pointer',
        padding: 16,
        backgroundColor: tokens.surfaceContainerLow,
        borderRadius: 16,
        border: `1px solid ${tokens.outlineVariant}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Thumbnail (grayscale). Always present unless images are switched
          off, so grid cards keep one shape when a feed ships no image. */}
      {!suppressHeroImage && (
        <Box
          style={{
            height: 180,
            borderRadius: 8,
            overflow: 'hidden',
            marginLeft: -16,
            marginRight: -16,
            marginTop: -16,
          }}
        >
          <ArticleImage src={imageUrl} label={sourceLabel(article.link, sourceTitle)} grayscale />
        </Box>
      )}

      {/* Date */}
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

      {/* Title */}
      <Text
        lineClamp={3}
        style={{
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          color: tokens.primary,
        }}
      >
        {article.title}
      </Text>

      {/* Description */}
      {article.description && (
        <Text
          lineClamp={2}
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            color: tokens.onSurfaceVariant,
          }}
        >
          {article.description}
        </Text>
      )}

      {/* Action row */}
      <Box style={{ display: 'flex', alignItems: 'center' }}>
        <Box style={{ flex: 1 }} />
        {onToggleBookmark && (
          <UnstyledButton
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(article);
            }}
            style={{ padding: 6, color: isBookmarked ? tokens.primary : tokens.onSurfaceVariant }}
          >
            {isBookmarked ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
          </UnstyledButton>
        )}
      </Box>
    </Box>
  );
}

interface CompactArticleRowProps {
  readonly article: FeedItem;
  readonly onSelect: (article: FeedItem) => void;
  readonly suppressHeroImage?: boolean;
  /** Feed name for the image placeholder when the article has no image. */
  readonly sourceTitle?: string;
}

export function CompactArticleRow({
  article,
  onSelect,
  suppressHeroImage,
  sourceTitle,
}: CompactArticleRowProps) {
  const imageUrl = useResolvedImage(article, suppressHeroImage);
  const formattedDate = formatDate(article.pubDate);

  return (
    <Box
      onClick={() => onSelect(article)}
      style={{
        cursor: 'pointer',
        padding: 16,
        backgroundColor: tokens.surfaceContainerLow,
        borderRadius: 12,
        border: `1px solid ${alpha(tokens.outlineVariant, 30)}`,
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}
    >
      {/* Content */}
      <Box style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          style={{
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            color: tokens.primary,
          }}
        >
          {article.title}
        </Text>
        {article.description && (
          <Text
            lineClamp={1}
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: tokens.onSurfaceVariant,
            }}
          >
            {article.description}
          </Text>
        )}
      </Box>

      {/* Thumbnail (grayscale, reduced opacity) */}
      {!suppressHeroImage && (
        <Box
          style={{
            width: 80,
            height: 60,
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <ArticleImage src={imageUrl} label={sourceLabel(article.link, sourceTitle)} compact grayscale opacity={0.7} />
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
