import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconArrowLeft, IconBookmark, IconBookmarkFilled, IconExternalLink, IconTextSize, IconX } from '@tabler/icons-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { FeedItem } from '../types';
import { tokens } from '../theme';
import { isBookmarked, addBookmark, removeBookmark } from '../db';

interface ArticleReadingProps {
  readonly article: FeedItem;
  readonly feedTitle: string;
  readonly onBack: () => void;
}

const FONT_SCALES = [1.0, 1.2, 1.4] as const;

export function ArticleReading({ article, feedTitle, onBack }: ArticleReadingProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [fontScaleIndex, setFontScaleIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const fontScale = FONT_SCALES[fontScaleIndex] ?? 1.0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  useEffect(() => {
    isBookmarked(article.link).then(setBookmarked);
  }, [article.link]);

  // Scroll fires many times per second — write the progress straight to the
  // bar's transform (composited, no layout) at most once per frame instead of
  // re-rendering the whole article on every event.
  const onScroll = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      const el = scrollRef.current;
      const bar = progressRef.current;
      if (!el || !bar) return;
      const max = el.scrollHeight - el.clientHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  async function toggleBookmark() {
    if (bookmarked) {
      await removeBookmark(article.link);
      setBookmarked(false);
    } else {
      await addBookmark({
        link: article.link,
        title: article.title,
        description: article.description,
        imageUrl: article.imageUrls[0],
        feedTitle,
        savedAt: Date.now(),
      });
      setBookmarked(true);
    }
  }

  function cycleFontSize() {
    setFontScaleIndex((prev) => (prev + 1) % FONT_SCALES.length);
  }

  const formattedDate = formatDate(article.pubDate);
  const imageUrl = article.imageUrls[0];

  return (
    <Box style={{ height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: tokens.background }}>
      {/* Floating action bar (glassmorphic) */}
      <Box style={{ padding: '16px 24px 0' }}>
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '10px 24px',
            backgroundColor: `${tokens.surfaceContainerLow}CC`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${tokens.outlineVariant}`,
            borderRadius: 999,
          }}
        >
          <UnstyledButton
            onClick={onBack}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: tokens.onSurfaceVariant,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <IconArrowLeft size={16} />
            Back to feed
          </UnstyledButton>

          {/* Divider */}
          <Box style={{ width: 1, height: 16, backgroundColor: tokens.outlineVariant }} />

          <UnstyledButton
            onClick={toggleBookmark}
            style={{ color: bookmarked ? tokens.primary : tokens.onSurfaceVariant }}
          >
            {bookmarked ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
          </UnstyledButton>

          <UnstyledButton
            component="a"
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            style={{ color: tokens.onSurfaceVariant }}
          >
            <IconExternalLink size={18} />
          </UnstyledButton>

          <UnstyledButton
            onClick={cycleFontSize}
            style={{ color: fontScale !== 1.0 ? tokens.primary : tokens.onSurfaceVariant }}
          >
            <IconTextSize size={18} />
          </UnstyledButton>
        </Box>
      </Box>

      {/* Reading progress bar */}
      <Box style={{ height: 2, backgroundColor: tokens.outlineVariant }}>
        <Box
          ref={progressRef}
          style={{
            height: '100%',
            backgroundColor: tokens.primary,
            transform: 'scaleX(0)',
            transformOrigin: 'left',
          }}
        />
      </Box>

      {/* Scrollable content */}
      <Box
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}
      >
        <Box style={{ maxWidth: 720, margin: '0 auto', paddingTop: 32 }}>
          {/* Metadata */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px 16px' }}>
            <Box
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: tokens.onSurface,
                backgroundColor: tokens.surfaceContainerHigh,
                padding: '4px 10px',
                borderRadius: 999,
              }}
            >
              {feedTitle}
            </Box>
            <Text style={{ fontSize: 11, color: tokens.onSurfaceVariant }}>
              ·
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: tokens.onSurfaceVariant,
              }}
            >
              {formattedDate}
            </Text>
          </Box>

          {/* Headline */}
          <Text
            style={{
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: tokens.primary,
              padding: '0 24px 24px',
            }}
          >
            {article.title}
          </Text>

          {/* Hero image (full color; tap to open viewer) */}
          {imageUrl && (
            <Box style={{ padding: '0 24px 32px' }}>
              <Box
                onClick={() => setViewerOpen(true)}
                style={{
                  height: 300,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: `1px solid ${tokens.outlineVariant}`,
                  cursor: 'zoom-in',
                }}
              >
                <img
                  src={imageUrl}
                  alt={article.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Article body */}
          <Box style={{ padding: '0 24px 32px' }}>
            <Text
              style={{
                fontSize: 20 * fontScale,
                lineHeight: 1.8,
                color: tokens.onSurface,
              }}
            >
              {article.description}
            </Text>
          </Box>

          {/* Divider */}
          <Box style={{ margin: '0 24px', height: 1, backgroundColor: tokens.outlineVariant }} />

          {/* Read full article link */}
          <Box style={{ padding: '24px 24px' }}>
            <UnstyledButton
              component="a"
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: tokens.primary,
              }}
            >
              Read full article →
            </UnstyledButton>
          </Box>
        </Box>
      </Box>

      {/* Fullscreen image viewer */}
      {viewerOpen && imageUrl && (
        <Box
          onClick={() => setViewerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.background,
            cursor: 'zoom-out',
          }}
        >
          <img
            src={imageUrl}
            alt={article.title}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
          <UnstyledButton
            onClick={() => setViewerOpen(false)}
            aria-label="Close image viewer"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              padding: 10,
              borderRadius: 999,
              backgroundColor: `${tokens.surfaceContainerLow}CC`,
              color: tokens.primary,
              display: 'flex',
            }}
          >
            <IconX size={20} />
          </UnstyledButton>
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
