import { Box, Stack, Tabs, Text, UnstyledButton, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconTrash } from '@tabler/icons-react';
import type { FeedItem, Lesson, LessonRequest, SavedIdea } from '../types';
import { tokens } from '../theme';
import { useSavedIdeas } from '../hooks/useSavedIdeas';
import { useLibraryBooks } from '../hooks/useLibraryBooks';
import { ErrorState, EmptyState, LoadingSkeleton } from '../components/StateViews';
import { LessonListItem } from '../components/learning/LessonListItem';
import { LessonsPanel } from './LessonsPanel';
import { BookmarksScreen } from './Bookmarks';

interface LibraryProps {
  readonly refreshKey: number;
  readonly onOpenLesson: (request: LessonRequest) => void;
  readonly onSelectArticle: (article: FeedItem) => void;
}

export function LibraryScreen({ refreshKey, onOpenLesson, onSelectArticle }: LibraryProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  return (
    <Box style={{ maxWidth: 720, margin: '0 auto', padding: isDesktop ? 24 : 16 }}>
      <Text component="h1" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: tokens.primary, margin: '0 0 16px' }}>
        Library
      </Text>
      <Tabs defaultValue="ideas" color="gray" keepMounted={false}>
        <Tabs.List grow>
          <Tabs.Tab value="ideas">Ideas</Tabs.Tab>
          <Tabs.Tab value="books">Books</Tabs.Tab>
          <Tabs.Tab value="lessons">Lessons</Tabs.Tab>
          <Tabs.Tab value="bookmarks">Bookmarks</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="ideas" pt="lg">
          <IdeasPanel refreshKey={refreshKey} />
        </Tabs.Panel>
        <Tabs.Panel value="books" pt="lg">
          <BooksPanel refreshKey={refreshKey} onOpenLesson={onOpenLesson} />
        </Tabs.Panel>
        <Tabs.Panel value="lessons" pt="lg">
          <LessonsPanel refreshKey={refreshKey} onOpenLesson={onOpenLesson} />
        </Tabs.Panel>
        <Tabs.Panel value="bookmarks" pt="lg">
          <BookmarksScreen onSelectArticle={onSelectArticle} />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}

function IdeasPanel({ refreshKey }: { readonly refreshKey: number }) {
  const { ideas, isLoading, errorMessage, remove, reload } = useSavedIdeas(refreshKey);
  if (isLoading) return <LoadingSkeleton />;
  if (errorMessage) return <ErrorState message={errorMessage} onRetry={reload} />;
  if (ideas.length > 0) {
    return (
      <Stack gap="sm">
        {ideas.map((idea) => (
          <IdeaRow key={idea.id} idea={idea} onRemove={() => void remove(idea.id).catch(() => undefined)} />
        ))}
      </Stack>
    );
  }
  return <EmptyState title="No saved ideas yet." message="Tap the bookmark on any card in For You to keep it here." />;
}

function IdeaRow({ idea, onRemove }: { readonly idea: SavedIdea; readonly onRemove: () => void }) {
  return (
    <Box style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 12, backgroundColor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}` }}>
      <UnstyledButton component="a" href={idea.sourceLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0 }}>
        <Text lineClamp={4} style={{ fontSize: 15, lineHeight: 1.6, color: tokens.primary }}>{idea.text}</Text>
        <Text style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 6 }}>
          {idea.sourceTitle} · {new Date(idea.savedAt).toLocaleDateString()}
        </Text>
      </UnstyledButton>
      <ActionIcon variant="subtle" size={44} aria-label="Remove saved idea" onClick={onRemove} style={{ color: tokens.textSecondary }}>
        <IconTrash size={18} />
      </ActionIcon>
    </Box>
  );
}

function BooksPanel({ refreshKey, onOpenLesson }: { readonly refreshKey: number; readonly onOpenLesson: (request: LessonRequest) => void }) {
  const { books, isLoading, errorMessage, reload } = useLibraryBooks(refreshKey);
  if (isLoading) return <LoadingSkeleton />;
  if (errorMessage) return <ErrorState message={errorMessage} onRetry={reload} />;
  if (books.length > 0) {
    const inProgress = books.filter((b) => b.completedAt === undefined);
    const finished = books.filter((b) => b.completedAt !== undefined);
    return (
      <Stack gap="xl">
        <BookSection title="In progress" books={inProgress} onOpenLesson={onOpenLesson} />
        <BookSection title="Finished" books={finished} onOpenLesson={onOpenLesson} />
      </Stack>
    );
  }
  return <EmptyState title="No book summaries yet." message="Open a book in Explore, or keep scrolling For You." />;
}

function BookSection({ title, books, onOpenLesson }: { readonly title: string; readonly books: readonly Lesson[]; readonly onOpenLesson: (request: LessonRequest) => void }) {
  if (books.length === 0) return null;
  return (
    <Box component="section">
      <Text component="h2" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.textSecondary, margin: '0 0 8px' }}>
        {title}
      </Text>
      {books.map((lesson) => (
        <LessonListItem
          key={lesson.link}
          title={lesson.title}
          feedTitle={lesson.author ?? lesson.feedTitle}
          imageUrl={lesson.imageUrl}
          readMinutes={lesson.readMinutes}
          isComplete={lesson.completedAt !== undefined}
          onOpen={() => onOpenLesson({ link: lesson.link, feedId: 0, title: lesson.title, feedTitle: lesson.feedTitle, description: '', imageUrl: lesson.imageUrl })}
        />
      ))}
    </Box>
  );
}
