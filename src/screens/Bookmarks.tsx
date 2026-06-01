import { useState, useEffect, useMemo } from 'react';
import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconBookmarkOff, IconBookmark } from '@tabler/icons-react';
import type { FeedItem, SavedArticle } from '../types';
import { getAllBookmarks, removeBookmark } from '../db';
import { LoadingSkeleton } from '../components/StateViews';
import { tokens } from '../theme';

interface BookmarksScreenProps {
  readonly onSelectArticle: (article: FeedItem) => void;
}

export function BookmarksScreen({ onSelectArticle }: BookmarksScreenProps) {
  const [bookmarks, setBookmarks] = useState<SavedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('#all');

  useEffect(() => {
    getAllBookmarks()
      .then((items) => items.sort((a, b) => b.savedAt - a.savedAt))
      .then(setBookmarks)
      .finally(() => setIsLoading(false));
  }, []);

  const tags = useMemo(() => {
    const sources = new Set(bookmarks.map((b) => b.feedTitle));
    return ['#all', ...sources];
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (selectedTag === '#all') return bookmarks;
    return bookmarks.filter((b) => b.feedTitle === selectedTag);
  }, [bookmarks, selectedTag]);

  async function handleRemove(link: string) {
    await removeBookmark(link);
    setBookmarks((prev) => prev.filter((b) => b.link !== link));
  }

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <Box style={{ padding: '32px 24px 24px' }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: tokens.primary,
          }}
        >
          Saved
        </Text>

        {/* Filter chips */}
        {tags.length > 1 && (
          <Box
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 16,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {tags.map((tag) => (
              <UnstyledButton
                key={tag}
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  backgroundColor: selectedTag === tag ? tokens.primary : tokens.surfaceContainerHigh,
                  color: selectedTag === tag ? tokens.onPrimary : tokens.onSurfaceVariant,
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {tag}
              </UnstyledButton>
            ))}
          </Box>
        )}
      </Box>

      {/* Bookmarks list */}
      {filteredBookmarks.length === 0 ? (
        <Box style={{ padding: '0 24px' }}>
          <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              minHeight: 300,
              justifyContent: 'center',
            }}
          >
            <IconBookmark size={40} color={tokens.onSurfaceVariant} stroke={1} />
            <Text
              style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: tokens.primary }}
            >
              No saved articles yet.
            </Text>
            <Text
              style={{ fontSize: 15, color: tokens.onSurfaceVariant, textAlign: 'center' }}
            >
              Bookmark articles from your feeds to read them later.
            </Text>
          </Box>
        </Box>
      ) : (
        <Box style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredBookmarks.map((bookmark) => (
            <SavedArticleCard
              key={bookmark.link}
              bookmark={bookmark}
              onSelect={onSelectArticle}
              onRemove={handleRemove}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

interface SavedArticleCardProps {
  readonly bookmark: SavedArticle;
  readonly onSelect: (article: FeedItem) => void;
  readonly onRemove: (link: string) => void;
}

function SavedArticleCard({ bookmark, onSelect, onRemove }: SavedArticleCardProps) {
  function handleClick() {
    onSelect({
      id: bookmark.link,
      feedId: 0,
      title: bookmark.title,
      link: bookmark.link,
      description: bookmark.description,
      pubDate: new Date(bookmark.savedAt).toISOString(),
      imageUrls: bookmark.imageUrl ? [bookmark.imageUrl] : [],
    });
  }

  return (
    <Box
      onClick={handleClick}
      style={{
        padding: 20,
        backgroundColor: tokens.surfaceContainerLow,
        borderRadius: 12,
        border: `1px solid ${tokens.outlineVariant}33`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <Box style={{ display: 'flex', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: tokens.onSurfaceVariant,
            textTransform: 'uppercase',
            flex: 1,
          }}
        >
          {bookmark.feedTitle}
        </Text>
        <UnstyledButton
          onClick={(e) => {
            e.stopPropagation();
            onRemove(bookmark.link);
          }}
          style={{ color: tokens.onSurfaceVariant, padding: 4 }}
        >
          <IconBookmarkOff size={16} />
        </UnstyledButton>
      </Box>

      {/* Title */}
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
        {bookmark.title}
      </Text>

      {/* Description */}
      {bookmark.description && (
        <Text
          lineClamp={3}
          style={{ fontSize: 15, lineHeight: 1.5, color: tokens.onSurfaceVariant }}
        >
          {bookmark.description}
        </Text>
      )}

      {/* Footer */}
      <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Box
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: tokens.onSurfaceVariant,
            backgroundColor: tokens.surfaceVariant,
            padding: '4px 12px',
            borderRadius: 4,
          }}
        >
          {bookmark.feedTitle}
        </Box>
        <Text style={{ fontSize: 11, color: tokens.outline }}>
          {new Date(bookmark.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </Box>
    </Box>
  );
}
