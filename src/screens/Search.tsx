import { useState, useEffect, useMemo } from 'react';
import { TextInput, Box, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { FeedItem } from '../types';
import { getAllArticles } from '../db';
import { CompactArticleRow } from '../components/ArticleCard';
import { LoadingSkeleton, EmptyState } from '../components/StateViews';
import { tokens } from '../theme';

interface SearchScreenProps {
  readonly onSelectArticle: (article: FeedItem) => void;
}

export function SearchScreen({ onSelectArticle }: SearchScreenProps) {
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    getAllArticles()
      .then(setArticles)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchText.trim()) return articles;
    const query = searchText.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query),
    );
  }, [articles, searchText]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box>
      <Box p="md" style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: tokens.background }}>
        <TextInput
          placeholder="Search articles..."
          leftSection={<IconSearch size={16} />}
          value={searchText}
          onChange={(e) => setSearchText(e.currentTarget.value)}
          styles={{
            input: { backgroundColor: tokens.elevated, borderColor: tokens.border, color: tokens.textPrimary },
          }}
        />
        {searchText && (
          <Text size="xs" c={tokens.textSecondary} mt="xs">
            {filteredArticles.length} result{filteredArticles.length !== 1 ? 's' : ''}
          </Text>
        )}
      </Box>

      {filteredArticles.length === 0 ? (
        <EmptyState message={searchText ? 'No articles match your search.' : 'No cached articles yet.'} />
      ) : (
        filteredArticles.map((article) => (
          <CompactArticleRow key={article.id} article={article} onSelect={onSelectArticle} />
        ))
      )}
    </Box>
  );
}
