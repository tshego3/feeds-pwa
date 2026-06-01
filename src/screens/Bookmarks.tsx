import { useState, useEffect } from 'react';
import { Box, Text, ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { FeedItem, SavedArticle } from '../types';
import { getAllBookmarks, removeBookmark } from '../db';
import { LoadingSkeleton, EmptyState } from '../components/StateViews';
import { tokens } from '../theme';

interface BookmarksScreenProps {
  readonly onSelectArticle: (article: FeedItem) => void;
}

export function BookmarksScreen({ onSelectArticle }: BookmarksScreenProps) {
  const [bookmarks, setBookmarks] = useState<SavedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllBookmarks()
      .then((items) => items.sort((a, b) => b.savedAt - a.savedAt))
      .then(setBookmarks)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleRemove(link: string) {
    await removeBookmark(link);
    setBookmarks((prev) => prev.filter((b) => b.link !== link));
  }

  if (isLoading) return <LoadingSkeleton />;

  if (bookmarks.length === 0) {
    return <EmptyState message="No bookmarks yet. Save articles to read later." />;
  }

  return (
    <Box>
      {bookmarks.map((bookmark) => (
        <Box
          key={bookmark.link}
          onClick={() =>
            onSelectArticle({
              id: bookmark.link,
              feedId: 0,
              title: bookmark.title,
              link: bookmark.link,
              description: bookmark.description,
              pubDate: new Date(bookmark.savedAt).toLocaleDateString(),
              imageUrls: bookmark.imageUrl ? [bookmark.imageUrl] : [],
            })
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderBottom: `1px solid ${tokens.border}`,
            cursor: 'pointer',
          }}
        >
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={500} c={tokens.textPrimary} lineClamp={1}>
              {bookmark.title}
            </Text>
            <Text size="xs" c={tokens.textSecondary} mt={2}>
              {bookmark.feedTitle} - {new Date(bookmark.savedAt).toLocaleDateString()}
            </Text>
          </Box>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(bookmark.link);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Box>
      ))}
    </Box>
  );
}
