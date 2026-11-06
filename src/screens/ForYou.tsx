import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Box, Skeleton, Text } from '@mantine/core';
import { useMediaQuery, useReducedMotion } from '@mantine/hooks';
import { IconFlame } from '@tabler/icons-react';
import type { FeedCard, FeedItem, InterestId, LessonRequest } from '../types';
import { SAFE_TOP, tokens } from '../theme';
import {
  answerReview,
  bookLink,
  coverUrl,
  getTodayProgress,
  INTEREST_SOURCES,
  listSavedIdeas,
  recordIdeasViewed,
  recordSeen,
  speakSegments,
  toggleSavedIdea,
  type SpeechHandle,
  type TodayProgress,
} from '../learning';
import { getInterests, getSpeechRatePreference, muteInterest, setInterests } from '../preferences';
import { useFeed } from '../hooks/useFeed';
import { useCardViewTracking } from '../hooks/useCardViewTracking';
import { ErrorState, EmptyState } from '../components/StateViews';
import { FeedCardFrame, type CardActions } from '../components/feed/FeedCardFrame';
import { ArticleInsightCard, BookIdeaCard, EndCard, GoalCard, QuizCard, QuoteCard, ReviewCard, TopicCard } from '../components/feed/FeedCards';
import { InterestPicker } from '../components/feed/InterestPicker';
import { DailyGoalRing } from '../components/feed/DailyGoalRing';

const HEADER_HEIGHT = 56;
const MOBILE_TAB_BAR = 64;
const PREFETCH_DISTANCE = 4;
const MAX_DOM_CARDS = 40;
const TRIM_COUNT = 20;
const TRIM_IDLE_MS = 300;
const MUTE_MS = 7 * 24 * 60 * 60 * 1000;

interface ForYouProps {
  readonly onOpenArticle: (article: FeedItem) => void;
  readonly onOpenLesson: (request: LessonRequest) => void;
}

export function ForYouScreen(props: ForYouProps) {
  const [interests, setInterestState] = useState<InterestId[]>(getInterests);
  if (interests.length === 0) {
    return (
      <InterestPicker
        interests={INTEREST_SOURCES}
        selected={[]}
        onSave={(ids) => {
          setInterests(ids);
          setInterestState(ids);
        }}
      />
    );
  }
  return <Feed interests={interests} {...props} />;
}

function Feed({ interests, onOpenArticle, onOpenLesson }: ForYouProps & { readonly interests: readonly InterestId[] }) {
  const feed = useFeed(interests);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<TodayProgress | null>(null);
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const speech = useRef<SpeechHandle | null>(null);
  // Scroll position to restore after trimming; null when no trim is pending.
  const pendingScrollTop = useRef<number | null>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    void getTodayProgress().then(setProgress).catch(() => undefined);
    void listSavedIdeas().then((ideas) => setSaved(new Set(ideas.map((i) => i.id)))).catch(() => undefined);
  }, []);

  const { cards, insertGoal, loadMore } = feed;
  const onViewed = useCallback(
    (ids: string[]) => {
      void (async () => {
        await recordIdeasViewed(ids.length);
        const before = progress?.ideasViewed ?? 0;
        const now = await getTodayProgress();
        setProgress(now);
        if (before < now.goal && now.ideasViewed >= now.goal) insertGoal(activeRef.current, now);
      })().catch(() => undefined);
    },
    [progress, insertGoal],
  );

  // Anything that reached the screen counts as seen and never comes back,
  // even when scrolled past quickly; only a 1.5 s view counts toward the goal.
  const tracking = useMemo(
    () => ({ onViewed, onShown: (ids: string[]) => void recordSeen(ids).catch(() => undefined) }),
    [onViewed],
  );
  const activeIndex = useCardViewTracking(rootRef, cards.length, tracking);
  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex >= cards.length - PREFETCH_DISTANCE) loadMore();
  }, [activeIndex, cards.length, loadMore]);

  // Stop speech when the reader moves to another card.
  useEffect(() => () => speech.current?.cancel(), [activeIndex]);

  useTrimHead(rootRef, cards.length, activeIndex, (height) => {
    // Record the absolute target now: once the cards are gone the feed is
    // shorter, and the browser clamps scrollTop before any relative fix-up.
    pendingScrollTop.current = Math.max(0, (rootRef.current?.scrollTop ?? 0) - height);
    setOffset((o) => o + TRIM_COUNT);
    feed.trimHead(TRIM_COUNT);
  });

  // Trimmed cards were above the reader, so restore the recorded position.
  // Browser scroll anchoring is off on the feed (Chromium would shift the
  // position too, replaying earlier cards; Safari has no anchoring), so this
  // is the only correction.
  useLayoutEffect(() => {
    if (pendingScrollTop.current !== null && rootRef.current) {
      rootRef.current.scrollTop = pendingScrollTop.current;
      pendingScrollTop.current = null;
    }
  }, [cards]);

  const scrollToCard = useCallback(
    (index: number) => {
      const target = rootRef.current?.querySelectorAll<HTMLElement>('[data-card-id]')[index];
      target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    },
    [reduceMotion],
  );

  const actionsFor = useCardActions({
    onOpenArticle,
    onOpenLesson,
    speech,
    setSaved,
    refresh: feed.refresh,
    onDone: () => {
      rootRef.current?.scrollTo({ top: 0 });
      feed.refresh();
    },
    onKeepGoing: () => scrollToCard(activeIndex + 1),
    onCheckNew: feed.checkForNew,
  });

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowDown' || event.key === 'j') {
      event.preventDefault();
      scrollToCard(Math.min(cards.length - 1, activeIndex + 1));
    } else if (event.key === 'ArrowUp' || event.key === 'k') {
      event.preventDefault();
      scrollToCard(Math.max(0, activeIndex - 1));
    } else if (event.key === 's') {
      const card = cards[activeIndex];
      if (card) actionsFor(card).onSave?.();
    }
  }

  // The mobile tab bar also covers the iPhone home-indicator area; the shell
  // pads the top by the iOS status-bar inset.
  const feedHeight = `calc(100dvh - ${HEADER_HEIGHT}px${isDesktop ? '' : ` - ${SAFE_TOP} - ${MOBILE_TAB_BAR}px - env(safe-area-inset-bottom)`})`;
  return (
    <Box>
      <FeedHeader progress={progress} />
      {feed.isLoading ? (
        <FeedSkeleton height={feedHeight} />
      ) : feed.errorMessage ? (
        <ErrorState message={feed.errorMessage} onRetry={feed.refresh} />
      ) : cards.length > 0 ? (
        <Box
          ref={rootRef}
          role="feed"
          aria-label="For You"
          aria-busy={feed.isLoading}
          tabIndex={0}
          onKeyDown={onKeyDown}
          style={{ height: feedHeight, overflowY: 'auto', overflowAnchor: 'none', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain', scrollbarWidth: 'none', outline: 'none' }}
        >
          {cards.map((card, index) => (
            <FeedCardView key={card.id} card={card} index={index} position={offset + index} isSaved={saved.has(cardIdeaId(card))} actions={actionsFor(card)} />
          ))}
        </Box>
      ) : (
        <EmptyState
          title="Nothing here yet"
          message="Connect to the internet to discover news, books, topics, and quizzes."
          primary={{ label: 'Check for new', onClick: feed.checkForNew }}
        />
      )}
    </Box>
  );
}

function FeedHeader({ progress }: { readonly progress: TodayProgress | null }) {
  return (
    <Box style={{ height: HEADER_HEIGHT, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: `1px solid ${tokens.outlineVariant}`, backgroundColor: tokens.surface }}>
      <Text component="h1" style={{ flex: 1, margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: tokens.primary }}>
        For You
      </Text>
      {progress && (
        <>
          <Box style={{ display: 'flex', alignItems: 'center', gap: 4, color: progress.streak.activeToday ? tokens.accent : tokens.textSecondary }} aria-label={`Streak: ${progress.streak.current} days`}>
            <IconFlame size={18} aria-hidden />
            <Text style={{ fontSize: 14, fontWeight: 600, color: 'inherit' }}>{progress.streak.current}</Text>
          </Box>
          <Box
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 999, backgroundColor: tokens.surfaceContainerHigh }}
          >
            <DailyGoalRing value={progress.ideasViewed} goal={progress.goal} size={26} showLabel={false} />
            <Text aria-hidden style={{ fontSize: 13, fontWeight: 600, color: tokens.primary }}>
              {Math.min(progress.ideasViewed, progress.goal)}/{progress.goal}
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}

function FeedSkeleton({ height }: { readonly height: string }) {
  return (
    <Box style={{ height, padding: 12, display: 'flex', justifyContent: 'center' }}>
      <Skeleton radius={24} style={{ width: '100%', maxWidth: 480, height: '100%' }} />
    </Box>
  );
}

// Trims the oldest cards once the DOM holds too many and the reader is well
// past them. Waits for a scroll pause so snap scrolling is not disturbed.
function useTrimHead(
  rootRef: React.RefObject<HTMLDivElement | null>,
  cardCount: number,
  activeIndex: number,
  onTrim: (removedHeight: number) => void,
) {
  const onTrimRef = useRef(onTrim);
  useEffect(() => {
    onTrimRef.current = onTrim;
  }, [onTrim]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || cardCount <= MAX_DOM_CARDS || activeIndex < TRIM_COUNT + PREFETCH_DISTANCE) return;
    let timer = 0;
    const trim = () => {
      const removed = [...root.querySelectorAll<HTMLElement>('[data-card-id]')].slice(0, TRIM_COUNT);
      onTrimRef.current(removed.reduce((height, el) => height + el.offsetHeight, 0));
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(trim, TRIM_IDLE_MS);
    };
    root.addEventListener('scroll', schedule, { passive: true });
    schedule();
    return () => {
      root.removeEventListener('scroll', schedule);
      window.clearTimeout(timer);
    };
  }, [rootRef, cardCount, activeIndex]);
}

interface CardActionDeps {
  readonly onOpenArticle: (article: FeedItem) => void;
  readonly onOpenLesson: (request: LessonRequest) => void;
  readonly speech: React.RefObject<SpeechHandle | null>;
  readonly setSaved: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
  readonly refresh: () => void;
  readonly onDone: () => void;
  readonly onKeepGoing: () => void;
  readonly onCheckNew: () => void;
}

interface FeedCardActions extends CardActions {
  readonly onAnswerReview?: (remembered: boolean) => void;
  readonly onDone?: () => void;
  readonly onKeepGoing?: () => void;
  readonly onCheckNew?: () => void;
}

function useCardActions(deps: CardActionDeps): (card: FeedCard) => FeedCardActions {
  return (card) => {
    const save = () => {
      void toggleSavedIdea(card).then((isSaved) => {
        deps.setSaved((current) => {
          const next = new Set(current);
          if (isSaved) next.add(cardIdeaId(card));
          else next.delete(cardIdeaId(card));
          return next;
        });
      }).catch(() => undefined);
    };
    const listen = () => {
      deps.speech.current?.cancel();
      deps.speech.current = speakSegments(speechText(card), {
        startIndex: 0, rate: getSpeechRatePreference(), voice: null,
        onSegmentStart: () => undefined, onEnd: () => undefined, onError: () => undefined,
      });
    };
    const mute = (interest: InterestId) => () => {
      muteInterest(interest, Date.now() + MUTE_MS);
      deps.refresh();
    };
    const share = (title: string, url: string) => () => void shareLink(title, url);
    switch (card.kind) {
      case 'article':
        return {
          onSave: save, onShare: share(card.article.title, card.article.link),
          onOpen: () => deps.onOpenArticle(card.article),
          onLearn: () => deps.onOpenLesson({ link: card.article.link, feedId: card.article.feedId, title: card.article.title, feedTitle: card.feedTitle, description: card.article.description, imageUrl: card.article.imageUrls[0] }),
        };
      case 'book-idea':
        return {
          onSave: save, onListen: listen, onShare: share(card.book.title, bookLink(card.book.gutenbergId)), onNotInterested: mute(card.book.interest),
          onOpen: () => deps.onOpenLesson({ link: bookLink(card.book.gutenbergId), feedId: 0, title: card.book.title, feedTitle: card.book.author, description: '', imageUrl: coverUrl(card.book.gutenbergId), book: card.book }),
        };
      case 'topic':
        return { onSave: save, onListen: listen, onShare: share(card.topic.title, card.topic.pageUrl), onNotInterested: mute(card.interest), onOpen: () => openExternal(card.topic.pageUrl) };
      case 'daily':
        return { onSave: save, onListen: listen, onShare: share(card.topic.title, card.topic.pageUrl), onOpen: () => openExternal(card.topic.pageUrl) };
      case 'quote':
        return { onSave: save, onListen: listen, onShare: share(card.book.title, bookLink(card.book.gutenbergId)) };
      case 'quiz':
        return { onSave: save };
      case 'review':
        return { onListen: listen, onAnswerReview: (remembered) => void answerReview(card.idea.id, remembered).catch(() => undefined) };
      case 'goal':
        return { onDone: deps.onDone, onKeepGoing: deps.onKeepGoing };
      case 'end':
        return { onCheckNew: deps.onCheckNew };
    }
  };
}

interface FeedCardViewProps {
  readonly card: FeedCard;
  readonly index: number;
  readonly position: number;
  readonly isSaved: boolean;
  readonly actions: FeedCardActions;
}

function FeedCardView({ card, index, position, isSaved, actions }: FeedCardViewProps) {
  const titleId = `feed-card-${position}`;
  const frame = { card, index, isSaved, titleId, ...actions };
  switch (card.kind) {
    case 'article':
      return <FeedCardFrame {...frame} label="News" openLabel="Read article"><ArticleInsightCard article={card.article} feedTitle={card.feedTitle} titleId={titleId} /></FeedCardFrame>;
    case 'book-idea':
      return <FeedCardFrame {...frame} label="Book idea" openLabel="Open book summary"><BookIdeaCard book={card.book} idea={card.idea} total={card.total} coverUrl={coverUrl(card.book.gutenbergId)} titleId={titleId} /></FeedCardFrame>;
    case 'topic':
      return <FeedCardFrame {...frame} label={interestTitle(card.interest)} openLabel="Open on Wikipedia"><TopicCard topic={card.topic} titleId={titleId} /></FeedCardFrame>;
    case 'daily':
      return <FeedCardFrame {...frame} label="Daily" openLabel="Open on Wikipedia"><TopicCard topic={card.topic} label={card.label} titleId={titleId} /></FeedCardFrame>;
    case 'quote':
      return <FeedCardFrame {...frame} label="Quote"><QuoteCard text={card.text} book={card.book} titleId={titleId} /></FeedCardFrame>;
    case 'quiz':
      return <FeedCardFrame {...frame} label="Quiz"><QuizCard quiz={card.quiz} titleId={titleId} onAnswered={() => undefined} /></FeedCardFrame>;
    case 'review':
      return <FeedCardFrame {...frame} label="Review"><ReviewCard idea={card.idea} titleId={titleId} onAnswer={actions.onAnswerReview ?? (() => undefined)} /></FeedCardFrame>;
    case 'goal':
      return <FeedCardFrame {...frame} label="Today"><GoalCard ideasViewed={card.ideasViewed} goal={card.goal} streak={card.streak} titleId={titleId} onDone={actions.onDone ?? (() => undefined)} onKeepGoing={actions.onKeepGoing ?? (() => undefined)} /></FeedCardFrame>;
    case 'end':
      return <FeedCardFrame {...frame} label="For You"><EndCard titleId={titleId} onCheckNew={actions.onCheckNew ?? (() => undefined)} /></FeedCardFrame>;
  }
}

// Review cards save under the original idea's id.
function cardIdeaId(card: FeedCard): string {
  return card.kind === 'review' ? card.idea.id : card.id;
}

function speechText(card: FeedCard): string[] {
  switch (card.kind) {
    case 'book-idea':
      return [card.idea.text];
    case 'topic':
    case 'daily':
      return [card.topic.title, card.topic.extract];
    case 'quote':
      return [card.text, `${card.book.author}.`];
    case 'review':
      return [card.idea.text];
    case 'article':
      return [card.article.title];
    default:
      return [];
  }
}

function interestTitle(id: InterestId): string {
  return INTEREST_SOURCES.find((s) => s.id === id)?.title ?? 'Topic';
}

function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function shareLink(title: string, url: string): Promise<void> {
  try {
    if (navigator.share) await navigator.share({ title, url });
    else await navigator.clipboard.writeText(url);
  } catch {
    // Dismissed share sheet or blocked clipboard: nothing to report.
  }
}
