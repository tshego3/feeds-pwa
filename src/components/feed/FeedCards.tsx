import { useState, type ReactNode } from 'react';
import { Box, Button, Text, UnstyledButton } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { BookRef, FeedItem, LessonCard, QuizQuestion, SavedIdea, StreakSummary, TopicSummary } from '../../types';
import { tokens } from '../../theme';
import { splitSentences } from '../../learning/text';
import { mirrorTextUrls } from '../../learning/sources';
import { SourceAttribution } from './SourceAttribution';
import { DailyGoalRing } from './DailyGoalRing';
import { ArticleImage } from '../ArticleImage';
import { useResolvedImage } from '../../hooks/useResolvedImage';

// Card bodies for the For You feed. Each renders from props only and sits
// inside FeedCardFrame. All text renders as React text nodes.

const WIKIPEDIA_LICENSE = 'CC BY-SA 4.0';

interface TitledProps {
  readonly titleId: string;
}

export function ArticleInsightCard({ article, feedTitle, titleId }: TitledProps & { readonly article: FeedItem; readonly feedTitle: string }) {
  const teaser = splitSentences(article.description).slice(0, 2).join(' ');
  // Feed image first, then the article page's og:image (same as the Dashboard).
  const imageUrl = useResolvedImage(article);
  return (
    <CardBody media={<ArticleImage src={imageUrl} label={feedTitle} />}>
      <CardTitle id={titleId}>{article.title}</CardTitle>
      <Muted>{feedTitle}</Muted>
      {teaser !== '' && <Body>{teaser}</Body>}
    </CardBody>
  );
}

export function BookIdeaCard({ book, idea, total, coverUrl, titleId }: TitledProps & { readonly book: BookRef; readonly idea: LessonCard; readonly total: number; readonly coverUrl: string }) {
  return (
    <>
      <CardBody>
        <Box style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Box style={{ width: 56, height: 84, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            <ArticleImage src={coverUrl} label={book.title} compact />
          </Box>
          <Box style={{ minWidth: 0 }}>
            <CardTitle id={titleId} size={17}>{book.title}</CardTitle>
            <Muted>{book.author} · Idea {idea.index + 1} of {total}</Muted>
          </Box>
        </Box>
        <Text style={{ fontSize: 20, lineHeight: 1.6, color: tokens.primary }}>{idea.text}</Text>
      </CardBody>
      <SourceAttribution label="Public domain text" href={bookTextHref(book)} />
    </>
  );
}

export function QuoteCard({ text, book, titleId }: TitledProps & { readonly text: string; readonly book: BookRef }) {
  return (
    <>
      <CardBody center>
        <Text id={titleId} component="blockquote" style={{ margin: 0, fontSize: 24, lineHeight: 1.5, fontWeight: 500, letterSpacing: '-0.01em', color: tokens.primary }}>
          {`“${text}”`}
        </Text>
        <Muted>{book.author}, {book.title}</Muted>
      </CardBody>
      <SourceAttribution label="Public domain text" href={bookTextHref(book)} />
    </>
  );
}

export function TopicCard({ topic, titleId, label }: TitledProps & { readonly topic: TopicSummary; readonly label?: string }) {
  return (
    <>
      <CardBody media={<ArticleImage src={topic.thumbnailUrl} label={topic.title} />}>
        {label && <Muted>{label}</Muted>}
        <CardTitle id={titleId}>{topic.title}</CardTitle>
        <Body>{topic.extract}</Body>
      </CardBody>
      <SourceAttribution label="Wikipedia" href={topic.pageUrl} license={WIKIPEDIA_LICENSE} />
    </>
  );
}

export function QuizCard({ quiz, titleId, onAnswered }: TitledProps & { readonly quiz: QuizQuestion; readonly onAnswered: (correct: boolean) => void }) {
  const [choice, setChoice] = useState<string | null>(null);
  function answer(option: string) {
    if (choice !== null) return;
    setChoice(option);
    onAnswered(option === quiz.correct);
  }
  return (
    <>
      <CardBody>
        <Muted>Quiz · {quiz.categoryName} · {quiz.difficulty}</Muted>
        <CardTitle id={titleId} size={20}>{quiz.question}</CardTitle>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quiz.options.map((option) => (
            <QuizOption key={option} option={option} choice={choice} correct={quiz.correct} onPick={answer} />
          ))}
        </Box>
        <Text aria-live="polite" style={{ fontSize: 14, color: tokens.textSecondary, minHeight: 20 }}>
          {choice === null ? '' : choice === quiz.correct ? 'Correct.' : `Not quite. The answer is ${quiz.correct}.`}
        </Text>
      </CardBody>
      <SourceAttribution label="Open Trivia DB" href="https://opentdb.com/" license="CC BY-SA 4.0" />
    </>
  );
}

function QuizOption({ option, choice, correct, onPick }: { readonly option: string; readonly choice: string | null; readonly correct: string; readonly onPick: (o: string) => void }) {
  const revealed = choice !== null;
  const isRight = revealed && option === correct;
  const isWrongPick = revealed && option === choice && option !== correct;
  return (
    <UnstyledButton
      onClick={() => onPick(option)}
      disabled={revealed}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '10px 14px', borderRadius: 12,
        border: `1px solid ${isRight ? tokens.accent : tokens.outlineVariant}`,
        backgroundColor: isRight ? tokens.secondaryContainer : tokens.surfaceContainerHigh,
        color: isWrongPick ? tokens.error : tokens.onSurface,
      }}
    >
      <Text style={{ flex: 1, fontSize: 15, color: 'inherit' }}>{option}</Text>
      {isRight && <IconCheck size={18} aria-label="Correct answer" />}
      {isWrongPick && <IconX size={18} aria-label="Your answer" />}
    </UnstyledButton>
  );
}

export function ReviewCard({ idea, titleId, onAnswer }: TitledProps & { readonly idea: SavedIdea; readonly onAnswer: (remembered: boolean) => void }) {
  const [answered, setAnswered] = useState(false);
  function answer(remembered: boolean) {
    setAnswered(true);
    onAnswer(remembered);
  }
  return (
    <CardBody center>
      <CardTitle id={titleId} size={18}>Remember this?</CardTitle>
      <Text style={{ fontSize: 20, lineHeight: 1.6, color: tokens.primary }}>{idea.text}</Text>
      <Muted>{idea.sourceTitle}</Muted>
      {answered ? (
        <Muted>Got it. We will bring it back later.</Muted>
      ) : (
        <Box style={{ display: 'flex', gap: 8 }}>
          <Button radius="xl" onClick={() => answer(true)} style={{ backgroundColor: tokens.primary, color: tokens.onPrimary }}>I remember</Button>
          <Button radius="xl" variant="default" onClick={() => answer(false)}>Show again</Button>
        </Box>
      )}
    </CardBody>
  );
}

export function GoalCard({ ideasViewed, goal, streak, titleId, onKeepGoing, onDone }: TitledProps & { readonly ideasViewed: number; readonly goal: number; readonly streak: StreakSummary; readonly onKeepGoing: () => void; readonly onDone: () => void }) {
  const days = streak.current === 1 ? 'day' : 'days';
  return (
    <CardBody center>
      <DailyGoalRing value={ideasViewed} goal={goal} size={120} />
      <CardTitle id={titleId}>Daily goal reached</CardTitle>
      <Body>{`${ideasViewed} ideas today. Your streak is ${streak.current} ${days}.`}</Body>
      <Box style={{ display: 'flex', gap: 8 }}>
        <Button radius="xl" onClick={onDone} style={{ backgroundColor: tokens.primary, color: tokens.onPrimary }}>Done for today</Button>
        <Button radius="xl" variant="default" onClick={onKeepGoing}>Keep scrolling</Button>
      </Box>
    </CardBody>
  );
}

export function EndCard({ titleId, onCheckNew }: TitledProps & { readonly onCheckNew: () => void }) {
  return (
    <CardBody center>
      <CardTitle id={titleId}>You are all caught up</CardTitle>
      <Body>You have seen everything new from your feeds and interests. New articles, topics, and book ideas arrive as your feeds update.</Body>
      <Box>
        <Button radius="xl" onClick={onCheckNew} style={{ backgroundColor: tokens.primary, color: tokens.onPrimary }}>Check for new</Button>
      </Box>
    </CardBody>
  );
}

function bookTextHref(book: BookRef): string {
  return mirrorTextUrls(book.gutenbergId)[0] ?? '';
}

// `media` fills a fixed-height slot at the top, so cards with and without
// images line up the same way while scrolling.
function CardBody({ media, center = false, children }: { readonly media?: ReactNode; readonly center?: boolean; readonly children: ReactNode }) {
  return (
    <>
      {media && (
        <Box style={{ height: '38%', minHeight: 140, margin: '12px 20px 0', borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}>
          {media}
        </Box>
      )}
      <Box style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', justifyContent: center ? 'center' : 'flex-start', gap: 12, padding: '16px 20px' }}>
        {children}
      </Box>
    </>
  );
}

function CardTitle({ id, size = 22, children }: { readonly id: string; readonly size?: number; readonly children: ReactNode }) {
  return (
    <Text id={id} component="h2" style={{ margin: 0, fontSize: size, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3, color: tokens.primary }}>
      {children}
    </Text>
  );
}

function Muted({ children }: { readonly children: ReactNode }) {
  return <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{children}</Text>;
}

function Body({ children }: { readonly children: ReactNode }) {
  return <Text style={{ fontSize: 16, lineHeight: 1.6, color: tokens.onSurface }}>{children}</Text>;
}
