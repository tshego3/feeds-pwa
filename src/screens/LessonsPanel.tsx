import { useEffect, useState } from 'react';
import { Box, Stack, Text } from '@mantine/core';
import type { FeedItem, Lesson, LessonRequest } from '../types';
import { tokens } from '../theme';
import { getAllSubscriptions } from '../db';
import { useStreak } from '../hooks/useStreak';
import { useLessonLibrary } from '../hooks/useLessonLibrary';
import { StreakBadge } from '../components/learning/StreakBadge';
import { LessonListItem } from '../components/learning/LessonListItem';
import { ErrorState, EmptyState, LoadingSkeleton } from '../components/StateViews';

interface LessonsPanelProps {
  readonly refreshKey: number;
  readonly onOpenLesson: (request: LessonRequest) => void;
}

// Article lessons and the streak (the v1 Learn tab, now a Library panel).
export function LessonsPanel({ refreshKey, onOpenLesson }: LessonsPanelProps) {
  const { streak, isLoading: streakLoading } = useStreak(refreshKey);
  const library = useLessonLibrary(refreshKey);
  const feedTitles = useFeedTitles();

  function body() {
    if (library.isLoading) return <LoadingSkeleton />;
    if (library.errorMessage) return <ErrorState message={library.errorMessage} onRetry={library.reload} />;
    if (library.hasItems) {
      return (
        <Stack gap="xl">
          <LessonSection title="Continue" lessons={library.inProgress} onOpenLesson={onOpenLesson} />
          <SuggestionSection suggestions={library.suggestions} feedTitles={feedTitles} onOpenLesson={onOpenLesson} />
          <LessonSection title="Completed" lessons={library.completed} onOpenLesson={onOpenLesson} />
        </Stack>
      );
    }
    return <EmptyState title="No lessons yet." message="Open an article and tap Learn to start your first lesson." />;
  }

  return (
    <Stack gap="xl">
      <StreakBadge streak={streak} isLoading={streakLoading} />
      {body()}
    </Stack>
  );
}

// Suggestions are cached FeedItems, which carry only a feedId.
function useFeedTitles(): ReadonlyMap<number, string> {
  const [titles, setTitles] = useState<ReadonlyMap<number, string>>(new Map());
  useEffect(() => {
    let active = true;
    getAllSubscriptions()
      .then((subs) => {
        if (active) setTitles(new Map(subs.map((s) => [s.id, s.title])));
      })
      .catch(() => {
        // Titles are cosmetic; rows fall back to "Article".
      });
    return () => {
      active = false;
    };
  }, []);
  return titles;
}

interface LessonSectionProps {
  readonly title: string;
  readonly lessons: readonly Lesson[];
  readonly onOpenLesson: (request: LessonRequest) => void;
}

function LessonSection({ title, lessons, onOpenLesson }: LessonSectionProps) {
  if (lessons.length === 0) return null;
  return (
    <Box component="section">
      <SectionHeading>{title}</SectionHeading>
      {lessons.map((lesson) => (
        <LessonListItem
          key={lesson.link}
          title={lesson.title}
          feedTitle={lesson.feedTitle}
          imageUrl={lesson.imageUrl}
          readMinutes={lesson.readMinutes}
          isComplete={lesson.completedAt !== undefined}
          onOpen={() => onOpenLesson(lessonToRequest(lesson))}
        />
      ))}
    </Box>
  );
}

interface SuggestionSectionProps {
  readonly suggestions: readonly FeedItem[];
  readonly feedTitles: ReadonlyMap<number, string>;
  readonly onOpenLesson: (request: LessonRequest) => void;
}

function SuggestionSection({ suggestions, feedTitles, onOpenLesson }: SuggestionSectionProps) {
  if (suggestions.length === 0) return null;
  return (
    <Box component="section">
      <SectionHeading>Start a lesson</SectionHeading>
      {suggestions.map((item) => {
        const feedTitle = feedTitles.get(item.feedId) ?? 'Article';
        return (
          <LessonListItem
            key={`${item.feedId}-${item.link}`}
            title={item.title}
            feedTitle={feedTitle}
            imageUrl={item.imageUrls[0]}
            isComplete={false}
            onOpen={() => onOpenLesson(articleToRequest(item, feedTitle))}
          />
        );
      })}
    </Box>
  );
}

function SectionHeading({ children }: { readonly children: string }) {
  return (
    <Text
      component="h2"
      style={{
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: tokens.textSecondary,
        margin: '0 0 8px',
      }}
    >
      {children}
    </Text>
  );
}

function lessonToRequest(lesson: Lesson): LessonRequest {
  return {
    link: lesson.link,
    feedId: lesson.feedId,
    title: lesson.title,
    feedTitle: lesson.feedTitle,
    description: '',
    imageUrl: lesson.imageUrl,
  };
}

function articleToRequest(item: FeedItem, feedTitle: string): LessonRequest {
  return {
    link: item.link,
    feedId: item.feedId,
    title: item.title,
    feedTitle,
    description: item.description,
    imageUrl: item.imageUrls[0],
  };
}
