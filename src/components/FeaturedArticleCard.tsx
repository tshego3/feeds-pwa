import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconBookmark, IconBookmarkFilled, IconExternalLink } from '@tabler/icons-react';
import type { FeedItem } from '../types';
import { tokens } from '../theme';
import { useResolvedImage } from '../hooks/useResolvedImage';

interface FeaturedArticleCardProps {
  readonly article: FeedItem;
  readonly onSelect: (article: FeedItem) => void;
  readonly isBookmarked?: boolean;
  readonly onToggleBookmark?: (article: FeedItem) => void;
  readonly suppressHeroImage?: boolean;
}

export function FeaturedArticleCard({
  article,
  onSelect,
  isBookmarked,
  onToggleBookmark,
  suppressHeroImage,
}: FeaturedArticleCardProps) {
  const imageUrl = useResolvedImage(article, suppressHeroImage);
  const formattedDate = article.pubDate ? formatDate(article.pubDate) : '';

  return (
    <Box
      onClick={() => onSelect(article)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        borderRadius: 16,
        border: `1px solid ${tokens.outlineVariant}`,
        minHeight: imageUrl ? 380 : 200,
        cursor: 'pointer',
      }}
    >
      {/* Background image (grayscale) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(0)',
          }}
        />
      )}

      {/* Fallback solid background */}
      {!imageUrl && (
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: tokens.surfaceContainerLow,
          }}
        />
      )}

      {/* Gradient overlay */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to top, ${tokens.background} 0%, ${tokens.background}66 40%, transparent 100%)`,
        }}
      />

      {/* Content overlay */}
      <Box
        style={{
          position: 'relative',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Metadata row */}
        <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Box
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: tokens.primary,
              flexShrink: 0,
            }}
          />
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
        </Box>

        {/* Title */}
        <Text
          lineClamp={3}
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
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
              fontSize: 17,
              lineHeight: 1.5,
              color: tokens.onSurfaceVariant,
            }}
          >
            {article.description}
          </Text>
        )}

        {/* Action row */}
        <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 999,
              backgroundColor: tokens.primary,
              color: tokens.onPrimary,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Read Article
          </Box>
          <Box style={{ flex: 1 }} />
          {onToggleBookmark && (
            <UnstyledButton
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(article);
              }}
              style={{ padding: 8, color: isBookmarked ? tokens.primary : tokens.onSurfaceVariant }}
            >
              {isBookmarked ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
            </UnstyledButton>
          )}
          <UnstyledButton
            onClick={(e) => {
              e.stopPropagation();
              window.open(article.link, '_blank', 'noopener,noreferrer');
            }}
            style={{ padding: 8, color: tokens.onSurfaceVariant }}
          >
            <IconExternalLink size={20} />
          </UnstyledButton>
        </Box>
      </Box>
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
