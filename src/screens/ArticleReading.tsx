import { Box, Text, ActionIcon, Image, ScrollArea } from '@mantine/core';
import { IconArrowLeft, IconBookmark, IconBookmarkFilled, IconExternalLink } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import type { FeedItem } from '../types';
import { tokens } from '../theme';
import { isBookmarked, addBookmark, removeBookmark } from '../db';

interface ArticleReadingProps {
  readonly article: FeedItem;
  readonly feedTitle: string;
  readonly onBack: () => void;
}

export function ArticleReading({ article, feedTitle, onBack }: ArticleReadingProps) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    isBookmarked(article.link).then(setBookmarked);
  }, [article.link]);

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

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          borderBottom: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
        }}
      >
        <ActionIcon variant="subtle" color="gray" onClick={onBack}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Text size="sm" fw={500} c={tokens.textPrimary} style={{ flex: 1 }} lineClamp={1}>
          {feedTitle}
        </Text>
        <ActionIcon variant="subtle" color="gray" onClick={toggleBookmark}>
          {bookmarked ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          component="a"
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconExternalLink size={20} />
        </ActionIcon>
      </Box>

      <ScrollArea style={{ flex: 1 }}>
        <Box p="md">
          {article.imageUrls[0] && (
            <Image
              src={article.imageUrls[0]}
              alt={article.title}
              radius="lg"
              mb="md"
              h={300}
              fit="cover"
            />
          )}
          <Text size="xl" fw={700} c={tokens.textPrimary} mb="xs">
            {article.title}
          </Text>
          <Text size="xs" c={tokens.textSecondary} mb="md">
            {article.pubDate}
          </Text>
          <Text size="sm" c={tokens.textPrimary} style={{ lineHeight: 1.7 }}>
            {article.description}
          </Text>
        </Box>
      </ScrollArea>
    </Box>
  );
}
