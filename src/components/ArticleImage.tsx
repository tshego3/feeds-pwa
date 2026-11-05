import { useEffect, useState, type CSSProperties } from 'react';
import { Box, Text } from '@mantine/core';
import { alpha, tokens } from '../theme';
import { monogram } from './imageLabels';

export { sourceLabel } from './imageLabels';

interface ArticleImageProps {
  readonly src?: string;
  /** Source name (feed, book, topic) shown when there is no usable image. */
  readonly label: string;
  /** Small slots (thumbnails) show the monogram only. */
  readonly compact?: boolean;
  /** Monolithic Clarity renders feed photos in grayscale. */
  readonly grayscale?: boolean;
  readonly opacity?: number;
  readonly style?: CSSProperties;
  /** Behind overlaid text: the placeholder shows its pattern only. */
  readonly backdrop?: boolean;
}

// An image slot that never collapses: when a feed ships no image, or the
// image fails to load (hotlink blocks, 404s), it shows a themed placeholder
// with the source's monogram, so cards keep one consistent shape.
export function ArticleImage({ src, label, compact = false, grayscale = false, opacity, style, backdrop = false }: ArticleImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <ImageFallback label={label} compact={compact} style={style} backdrop={backdrop} />;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        filter: grayscale ? 'saturate(0)' : undefined,
        opacity,
        ...style,
      }}
    />
  );
}

interface ImageFallbackProps {
  readonly label: string;
  readonly compact?: boolean;
  readonly style?: CSSProperties;
  readonly backdrop?: boolean;
}

// Themed placeholder (asset rule: no generated imagery). Tonal layers and a
// faint diagonal rule pattern, with the source monogram.
export function ImageFallback({ label, compact = false, style, backdrop = false }: ImageFallbackProps) {
  return (
    <Box
      aria-hidden
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: tokens.surfaceContainerHigh,
        backgroundImage: `repeating-linear-gradient(135deg, ${alpha(tokens.outlineVariant, 35)} 0 1px, transparent 1px 14px), linear-gradient(160deg, ${tokens.surfaceContainerHigh}, ${tokens.surfaceVariant})`,
        ...style,
      }}
    >
      {!backdrop && (
      <Text
        style={{
          fontSize: compact ? 18 : 40,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: tokens.textSecondary,
        }}
      >
        {monogram(label)}
      </Text>
      )}
      {!compact && !backdrop && (
        <Text
          lineClamp={1}
          style={{
            maxWidth: '80%',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: tokens.textSecondary,
          }}
        >
          {label}
        </Text>
      )}
    </Box>
  );
}
