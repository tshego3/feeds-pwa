import { Box, Text, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowLeft, IconArticle, IconBookmark, IconBookmarkFilled, IconCheck, IconExternalLink, IconShare, IconTextSize, IconX } from '@tabler/icons-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { FeedItem } from '../types';
import { tokens } from '../theme';
import { isBookmarked, addBookmark, removeBookmark } from '../db';
import { useResolvedImage } from '../hooks/useResolvedImage';

interface ArticleReadingProps {
  readonly article: FeedItem;
  readonly feedTitle: string;
  readonly onBack: () => void;
}

const FONT_SCALES = [1.0, 1.2, 1.4] as const;

// Sites that refuse framing usually do so instantly, but a slow origin should
// not be reported as blocked before it has had a fair chance to answer.
const FRAME_TIMEOUT_MS = 8000;

type FrameStatus = 'loading' | 'ready' | 'blocked';

export function ArticleReading({ article, feedTitle, onBack }: ArticleReadingProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [fontScaleIndex, setFontScaleIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [frameStatus, setFrameStatus] = useState<FrameStatus>('loading');
  const fontScale = FONT_SCALES[fontScaleIndex] ?? 1.0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const rafId = useRef(0);
  const copiedTimer = useRef(0);
  const frameTimer = useRef(0);
  const imageUrl = useResolvedImage(article);
  const showLabels = useMediaQuery('(min-width: 768px)');
  const articleUrl = toWebUrl(article.link);

  useEffect(() => {
    isBookmarked(article.link).then(setBookmarked);
  }, [article.link]);

  // The feed list stays mounted behind this overlay. Freezing the page scroll
  // keeps touch gestures from reaching it; the position itself is untouched,
  // so closing the article lands the reader exactly where they left off.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  useEffect(() => () => window.clearTimeout(frameTimer.current), []);

  function openReader() {
    setFrameStatus('loading');
    window.clearTimeout(frameTimer.current);
    frameTimer.current = window.setTimeout(() => setFrameStatus('blocked'), FRAME_TIMEOUT_MS);
    setReaderOpen(true);
  }

  function closeReader() {
    window.clearTimeout(frameTimer.current);
    setReaderOpen(false);
  }

  // A frame refused by X-Frame-Options or a frame-ancestors policy still fires
  // load, but it stays on about:blank, which we can read because it is not
  // cross-origin. A page that actually rendered throws on the same read, so the
  // SecurityError is the success signal here.
  function onFrameLoad() {
    window.clearTimeout(frameTimer.current);
    try {
      if (frameRef.current?.contentWindow?.location.href === 'about:blank') {
        setFrameStatus('blocked');
        return;
      }
    } catch {
      // Cross-origin document loaded. Fall through to ready.
    }
    setFrameStatus('ready');
  }

  // Native share sheet where the platform offers one; copying the link is the
  // desktop fallback, confirmed by a brief check mark on the button.
  async function shareArticle() {
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, url: article.link });
      } catch {
        // Dismissing the share sheet rejects with AbortError. Nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(article.link);
    } catch {
      // Clipboard access can be blocked; leave the button unchanged rather than
      // claiming a copy that did not happen.
      return;
    }
    setLinkCopied(true);
    copiedTimer.current = window.setTimeout(() => setLinkCopied(false), 2000);
  }

  async function toggleBookmark() {
    if (bookmarked) {
      await removeBookmark(article.link);
      setBookmarked(false);
    } else {
      await addBookmark({
        link: article.link,
        title: article.title,
        description: article.description,
        imageUrl,
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

  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: tokens.background,
      }}
    >
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
            onClick={shareArticle}
            aria-label={linkCopied ? 'Link copied' : 'Share article'}
            style={{ color: linkCopied ? tokens.primary : tokens.onSurfaceVariant }}
          >
            {linkCopied ? <IconCheck size={18} /> : <IconShare size={18} />}
          </UnstyledButton>

          <UnstyledButton
            onClick={cycleFontSize}
            style={{ color: fontScale !== 1.0 ? tokens.primary : tokens.onSurfaceVariant }}
          >
            <IconTextSize size={18} />
          </UnstyledButton>

          {articleUrl && (
            <>
              {/* Divider */}
              <Box
                style={{
                  width: 1,
                  height: 16,
                  marginLeft: 'auto',
                  backgroundColor: tokens.outlineVariant,
                }}
              />

              <UnstyledButton
                onClick={openReader}
                aria-label="Read full article"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: tokens.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <IconArticle size={18} />
                {showLabels && 'Read full article'}
              </UnstyledButton>
            </>
          )}
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
        style={{ flex: 1, overflow: 'auto', overscrollBehavior: 'contain', padding: '0 0 80px' }}
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
        </Box>
      </Box>

      {/* In-app article viewer */}
      {readerOpen && articleUrl && (
        <Box
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: tokens.background,
          }}
        >
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 16px',
              borderBottom: `1px solid ${tokens.outlineVariant}`,
            }}
          >
            <UnstyledButton
              onClick={closeReader}
              aria-label="Close full article"
              style={{ color: tokens.onSurfaceVariant, display: 'flex' }}
            >
              <IconX size={20} />
            </UnstyledButton>

            <Text
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 500,
                color: tokens.onSurfaceVariant,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {articleUrl.hostname}
            </Text>

            <UnstyledButton
              component="a"
              href={articleUrl.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in browser"
              style={{ color: tokens.onSurfaceVariant, display: 'flex' }}
            >
              <IconExternalLink size={18} />
            </UnstyledButton>
          </Box>

          <Box style={{ flex: 1, position: 'relative' }}>
            <iframe
              ref={frameRef}
              src={articleUrl.href}
              title={article.title}
              onLoad={onFrameLoad}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />

            {frameStatus !== 'ready' && (
              <Box
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  padding: 24,
                  textAlign: 'center',
                  backgroundColor: tokens.background,
                }}
              >
                <Text style={{ fontSize: 15, color: tokens.onSurfaceVariant }}>
                  {frameStatus === 'loading'
                    ? 'Loading article...'
                    : 'This site does not allow reading inside the app.'}
                </Text>

                {frameStatus === 'blocked' && (
                  <UnstyledButton
                    component="a"
                    href={articleUrl.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: tokens.onPrimary,
                      backgroundColor: tokens.primary,
                      padding: '10px 20px',
                      borderRadius: 999,
                    }}
                  >
                    Open in browser
                  </UnstyledButton>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}

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

// Feed links are untrusted input, and an iframe src accepts scheme handlers a
// plain link would not. Only http(s) targets reach the viewer.
function toWebUrl(link: string): URL | null {
  try {
    const url = new URL(link);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    // Relative or malformed links cannot be opened. Hide the control instead.
    return null;
  }
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
