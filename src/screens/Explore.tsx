import { useState } from 'react';
import { Box, Button, Chip, Group, ScrollArea, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { BookRef, InterestId, Lesson, LessonRequest, TopicSummary } from '../types';
import { tokens } from '../theme';
import { bookLink, coverUrl, INTEREST_SOURCES } from '../learning';
import { getInterests } from '../preferences';
import { useDiscovery } from '../hooks/useDiscovery';
import { ErrorState, EmptyState, LoadingSkeleton } from '../components/StateViews';
import { SourceAttribution } from '../components/feed/SourceAttribution';
import { ArticleImage } from '../components/ArticleImage';

interface ExploreProps {
  readonly onOpenLesson: (request: LessonRequest) => void;
}

export function ExploreScreen({ onOpenLesson }: ExploreProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [interest, setInterest] = useState<InterestId>(() => getInterests()[0] ?? 'philosophy');
  const discovery = useDiscovery(interest);

  function body() {
    if (discovery.isLoading) return <LoadingSkeleton />;
    if (discovery.errorMessage) return <ErrorState message={discovery.errorMessage} onRetry={discovery.reload} />;
    if (discovery.books.length > 0 || discovery.topics.length > 0) {
      return (
        <Stack gap="xl">
          <BookGrid books={discovery.books} built={discovery.builtBooks} onOpenLesson={onOpenLesson} onLoadMore={discovery.loadMore} catalogDate={discovery.catalogDate} />
          <TopicList topics={discovery.topics} />
        </Stack>
      );
    }
    return <EmptyState title="Nothing to explore yet." message="Connect to the internet to load topics for this interest." />;
  }

  return (
    <Box style={{ maxWidth: 960, margin: '0 auto', padding: isDesktop ? 24 : 16 }}>
      <Text component="h1" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: tokens.primary, margin: '0 0 16px' }}>
        Explore
      </Text>
      <ScrollArea type="never" mb="lg">
        <Chip.Group value={interest} onChange={(value) => setInterest(value as InterestId)}>
          <Group gap="xs" wrap="nowrap">
            {INTEREST_SOURCES.map((source) => (
              <Chip key={source.id} value={source.id} radius="xl" color="gray" variant="outline">
                {source.title}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </ScrollArea>
      {body()}
    </Box>
  );
}

interface BookGridProps {
  readonly books: readonly BookRef[];
  readonly built: readonly Lesson[];
  readonly catalogDate: string;
  readonly onOpenLesson: (request: LessonRequest) => void;
  readonly onLoadMore: () => void;
}

function BookGrid({ books, built, catalogDate, onOpenLesson, onLoadMore }: BookGridProps) {
  const ready = new Set(built.map((lesson) => lesson.link));
  return (
    <Box component="section">
      <SectionHeading>Books</SectionHeading>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
        {books.map((book) => (
          <BookTile key={book.gutenbergId} book={book} isReady={ready.has(bookLink(book.gutenbergId))} onOpen={() => onOpenLesson(bookRequest(book))} />
        ))}
      </SimpleGrid>
      <Group justify="space-between" mt="md">
        <Text style={{ fontSize: 12, color: tokens.textSecondary }}>{catalogDate ? `Catalog updated ${catalogDate}` : ''}</Text>
        <Button variant="subtle" onClick={onLoadMore} style={{ color: tokens.primary }}>Load more</Button>
      </Group>
    </Box>
  );
}

function BookTile({ book, isReady, onOpen }: { readonly book: BookRef; readonly isReady: boolean; readonly onOpen: () => void }) {
  return (
    <UnstyledButton onClick={onOpen} style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 44 }}>
      <Box style={{ aspectRatio: '2 / 3', borderRadius: 12, overflow: 'hidden', backgroundColor: tokens.surfaceContainerHigh }}>
        <ArticleImage src={coverUrl(book.gutenbergId)} label={book.title} />
      </Box>
      <Text lineClamp={2} style={{ fontSize: 14, fontWeight: 600, color: tokens.primary }}>{book.title}</Text>
      <Text lineClamp={1} style={{ fontSize: 12, color: tokens.textSecondary }}>{book.author}</Text>
      <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: isReady ? tokens.accent : tokens.textSecondary }}>
        {isReady ? 'READY' : 'TAP TO SUMMARIZE'}
      </Text>
    </UnstyledButton>
  );
}

function TopicList({ topics }: { readonly topics: readonly TopicSummary[] }) {
  if (topics.length === 0) return null;
  return (
    <Box component="section">
      <SectionHeading>Topics</SectionHeading>
      <Stack gap="sm">
        {topics.map((topic) => (
          <UnstyledButton
            key={topic.title}
            component="a"
            href={topic.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', padding: 16, borderRadius: 12, backgroundColor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}` }}
          >
            <Text style={{ fontSize: 16, fontWeight: 600, color: tokens.primary }}>{topic.title}</Text>
            <Text lineClamp={3} style={{ fontSize: 14, lineHeight: 1.6, color: tokens.onSurface, marginTop: 4 }}>{topic.extract}</Text>
          </UnstyledButton>
        ))}
      </Stack>
      <Box mt="sm">
        <SourceAttribution label="Wikipedia" href="https://en.wikipedia.org/" license="CC BY-SA 4.0" />
      </Box>
    </Box>
  );
}

function SectionHeading({ children }: { readonly children: string }) {
  return (
    <Text component="h2" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.textSecondary, margin: '0 0 12px' }}>
      {children}
    </Text>
  );
}

export function bookRequest(book: BookRef): LessonRequest {
  return {
    link: bookLink(book.gutenbergId),
    feedId: 0,
    title: book.title,
    feedTitle: book.author,
    description: '',
    imageUrl: coverUrl(book.gutenbergId),
    book,
  };
}
