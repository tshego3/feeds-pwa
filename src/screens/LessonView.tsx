import { useCallback, useEffect, useMemo } from 'react';
import { ActionIcon, Anchor, Box, Skeleton, Stack, Tabs, Text } from '@mantine/core';
import { IconArrowLeft, IconExternalLink } from '@tabler/icons-react';
import type { Lesson, LessonRequest } from '../types';
import { SAFE_TOP, tokens } from '../theme';
import { SPEECH_RATES } from '../preferences';
import { useLesson } from '../hooks/useLesson';
import { useSpeech } from '../hooks/useSpeech';
import { ErrorState, EmptyState } from '../components/StateViews';
import { LessonCardCarousel } from '../components/learning/LessonCardCarousel';
import { TextSummaryList } from '../components/learning/TextSummaryList';
import { AudioSummaryPlayer } from '../components/learning/AudioSummaryPlayer';

interface LessonViewProps {
  readonly request: LessonRequest;
  readonly onClose: () => void;
  readonly onCompleted: () => void;
}

// Full-screen overlay. zIndex 450 sits above ArticleReading (400), which can
// open a lesson for the article on screen.
export function LessonView({ request, onClose, onCompleted }: LessonViewProps) {
  const { lesson, isLoading, errorMessage, retry, markComplete } = useLesson(request);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const complete = useCallback(() => {
    markComplete()
      .then(onCompleted)
      .catch(() => {
        // Progress is best effort; the lesson itself stays readable.
      });
  }, [markComplete, onCompleted]);

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label={`Lesson: ${request.title}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 450,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: SAFE_TOP,
        backgroundColor: tokens.background,
      }}
    >
      <LessonHeader title={request.title} onClose={onClose} />
      <Box style={{ flex: 1, overflow: 'auto', overscrollBehavior: 'contain' }}>
        <Box style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 80px' }}>
          {isLoading ? (
            <LessonSkeleton isBook={request.book !== undefined} />
          ) : errorMessage ? (
            <ErrorState message={errorMessage} onRetry={retry} />
          ) : lesson ? (
            <LessonBody lesson={lesson} onComplete={complete} />
          ) : (
            <EmptyState title="No lesson yet." message="No lesson content yet." />
          )}
        </Box>
      </Box>
    </Box>
  );
}

function LessonHeader({ title, onClose }: { readonly title: string; readonly onClose: () => void }) {
  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 8px',
        borderBottom: `1px solid ${tokens.outlineVariant}`,
        backgroundColor: tokens.surfaceContainerLow,
      }}
    >
      <ActionIcon variant="subtle" size={44} aria-label="Close lesson" onClick={onClose} style={{ color: tokens.primary }}>
        <IconArrowLeft size={20} />
      </ActionIcon>
      <Text lineClamp={1} style={{ flex: 1, fontSize: 15, fontWeight: 600, color: tokens.primary }}>
        {title}
      </Text>
    </Box>
  );
}

function LessonSkeleton({ isBook }: { readonly isBook: boolean }) {
  return (
    <Stack gap="md">
      {isBook && (
        <Text aria-live="polite" style={{ fontSize: 14, color: tokens.textSecondary }}>
          Summarizing this book. This can take up to a minute the first time.
        </Text>
      )}
      <Skeleton height={180} radius={16} />
      <Skeleton height={36} radius={8} />
      <Skeleton height={260} radius={16} />
    </Stack>
  );
}

function LessonBody({ lesson, onComplete }: { readonly lesson: Lesson; readonly onComplete: () => void }) {
  const isComplete = lesson.completedAt !== undefined;
  if (lesson.kind === 'book') return <BookLessonBody lesson={lesson} onComplete={onComplete} />;
  return (
    <Stack gap="lg">
      {lesson.imageUrl && (
        <Box style={{ height: 180, borderRadius: 16, overflow: 'hidden' }}>
          <img src={lesson.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}
      <Box>
        <Text component="h1" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25, color: tokens.primary, margin: 0 }}>
          {lesson.title}
        </Text>
        <Text style={{ fontSize: 13, color: tokens.textSecondary, marginTop: 6 }}>
          {lesson.feedTitle} · {lesson.readMinutes} min read
        </Text>
      </Box>
      {/* keepMounted=false unmounts the Listen panel on tab change, which stops speech. */}
      <Tabs defaultValue="cards" keepMounted={false} color="gray">
        <Tabs.List grow>
          <Tabs.Tab value="cards">Cards</Tabs.Tab>
          <Tabs.Tab value="summary">Summary</Tabs.Tab>
          <Tabs.Tab value="listen">Listen</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="cards" pt="lg">
          <LessonCardCarousel cards={lesson.cards} title={lesson.title} isComplete={isComplete} onComplete={onComplete} />
        </Tabs.Panel>
        <Tabs.Panel value="summary" pt="lg">
          <TextSummaryList summary={lesson.summary} source={lesson.summarySource} />
        </Tabs.Panel>
        <Tabs.Panel value="listen" pt="lg">
          <ListenPanel summary={lesson.summary} onComplete={onComplete} />
        </Tabs.Panel>
      </Tabs>
      <Anchor
        href={lesson.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, color: tokens.primary, fontSize: 14 }}
      >
        Read the original <IconExternalLink size={16} aria-hidden />
      </Anchor>
    </Stack>
  );
}

// Book summaries: cover beside the title, "Idea N" cards, and the quotes.
function BookLessonBody({ lesson, onComplete }: { readonly lesson: Lesson; readonly onComplete: () => void }) {
  const isComplete = lesson.completedAt !== undefined;
  const quotes = lesson.quotes ?? [];
  // Stable reference: useSpeech cancels playback whenever its segments change.
  const ideaTexts = useMemo(() => lesson.cards.map((card) => card.text), [lesson.cards]);
  return (
    <Stack gap="lg">
      <Box style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        {lesson.imageUrl && (
          <img src={lesson.imageUrl} alt="" style={{ width: 96, height: 144, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
        )}
        <Box style={{ minWidth: 0 }}>
          <Text component="h1" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25, color: tokens.primary, margin: 0 }}>
            {lesson.title}
          </Text>
          <Text style={{ fontSize: 13, color: tokens.textSecondary, marginTop: 6 }}>
            {lesson.author ?? lesson.feedTitle} · {lesson.cards.length} ideas · {lesson.readMinutes} min
          </Text>
        </Box>
      </Box>
      <Tabs defaultValue="cards" keepMounted={false} color="gray">
        <Tabs.List grow>
          <Tabs.Tab value="cards">Ideas</Tabs.Tab>
          <Tabs.Tab value="summary">Summary</Tabs.Tab>
          <Tabs.Tab value="listen">Listen</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="cards" pt="lg">
          <LessonCardCarousel cards={lesson.cards} title={lesson.title} isComplete={isComplete} onComplete={onComplete} cardLabel="Idea" />
        </Tabs.Panel>
        <Tabs.Panel value="summary" pt="lg">
          <Stack gap="xl">
            <TextSummaryList summary={lesson.summary} source={lesson.summarySource} />
            {quotes.length > 0 && <QuoteList quotes={quotes} />}
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="listen" pt="lg">
          <ListenPanel summary={ideaTexts} onComplete={onComplete} />
        </Tabs.Panel>
      </Tabs>
      <Anchor
        href={lesson.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, color: tokens.primary, fontSize: 14 }}
      >
        Public domain text <IconExternalLink size={16} aria-hidden />
      </Anchor>
    </Stack>
  );
}

function QuoteList({ quotes }: { readonly quotes: readonly string[] }) {
  return (
    <Box component="section">
      <Text component="h2" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.textSecondary, margin: '0 0 12px' }}>
        Quotes
      </Text>
      <Stack gap="md">
        {quotes.map((quote) => (
          <Text key={quote} component="blockquote" style={{ margin: 0, paddingLeft: 12, borderLeft: `2px solid ${tokens.outlineVariant}`, fontSize: 16, lineHeight: 1.6, color: tokens.onSurface }}>
            {quote}
          </Text>
        ))}
      </Stack>
    </Box>
  );
}

function ListenPanel({ summary, onComplete }: { readonly summary: readonly string[]; readonly onComplete: () => void }) {
  const speech = useSpeech(summary, onComplete);
  return (
    <AudioSummaryPlayer
      segments={summary}
      status={speech.status}
      currentIndex={speech.currentIndex}
      rate={speech.rate}
      rates={SPEECH_RATES}
      voices={speech.voices}
      voiceUri={speech.voiceUri}
      onPlay={speech.play}
      onPause={speech.pause}
      onStop={speech.stop}
      onRateChange={speech.setRate}
      onVoiceChange={speech.setVoiceUri}
    />
  );
}
