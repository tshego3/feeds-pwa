import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ActionIcon, Box, Button, Text } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconCheck, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { LessonCard } from '../../types';
import { tokens } from '../../theme';
import { LessonCardView } from './LessonCardView';

interface LessonCardCarouselProps {
  readonly cards: readonly LessonCard[];
  readonly title: string;
  readonly isComplete: boolean;
  readonly onComplete: () => void;
  readonly cardLabel?: string;
}

// Native CSS scroll-snap: swipe on touch, arrow buttons and arrow keys
// everywhere. An IntersectionObserver tracks which slide is in view.
export function LessonCardCarousel({ cards, title, isComplete, onComplete, cardLabel }: LessonCardCarouselProps) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const reduceMotion = useReducedMotion();
  const lastIndex = cards.length - 1;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting && Number.isInteger(index)) setActive(index);
        }
      },
      { root: track, threshold: 0.6 },
    );
    slideRefs.current.forEach((slide) => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, [cards]);

  function goTo(index: number) {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' && active > 0) goTo(active - 1);
    if (event.key === 'ArrowRight' && active < lastIndex) goTo(active + 1);
  }

  if (cards.length === 0) return null;

  return (
    <Box>
      <Box
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Key ideas: ${title}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{
          position: 'relative',
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          borderRadius: 16,
        }}
      >
        {cards.map((card, i) => (
          <Box
            key={card.index}
            ref={(el: HTMLDivElement | null) => {
              slideRefs.current[i] = el;
            }}
            data-index={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${cards.length}`}
            style={{ flex: '0 0 100%', scrollSnapAlign: 'center' }}
          >
            <LessonCardView card={card} label={cardLabel} />
          </Box>
        ))}
      </Box>
      <CarouselControls
        active={active}
        total={cards.length}
        onPrevious={() => goTo(active - 1)}
        onNext={() => goTo(active + 1)}
      />
      {active === lastIndex && <CompleteButton isComplete={isComplete} onComplete={onComplete} />}
    </Box>
  );
}

interface CarouselControlsProps {
  readonly active: number;
  readonly total: number;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

function CarouselControls({ active, total, onPrevious, onNext }: CarouselControlsProps) {
  return (
    <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
      <ActionIcon
        variant="subtle"
        size={44}
        aria-label="Previous key idea"
        disabled={active === 0}
        onClick={onPrevious}
        style={{ color: tokens.primary, backgroundColor: 'transparent' }}
      >
        <IconChevronLeft size={22} />
      </ActionIcon>
      <Text aria-live="polite" style={{ fontSize: 13, fontWeight: 600, color: tokens.textSecondary }}>
        {active + 1} of {total}
      </Text>
      <ActionIcon
        variant="subtle"
        size={44}
        aria-label="Next key idea"
        disabled={active === total - 1}
        onClick={onNext}
        style={{ color: tokens.primary, backgroundColor: 'transparent' }}
      >
        <IconChevronRight size={22} />
      </ActionIcon>
    </Box>
  );
}

function CompleteButton({ isComplete, onComplete }: { readonly isComplete: boolean; readonly onComplete: () => void }) {
  if (isComplete) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16, color: tokens.primary }}>
        <IconCheck size={18} aria-hidden />
        <Text style={{ fontSize: 15, fontWeight: 600 }}>Completed</Text>
      </Box>
    );
  }
  return (
    <Button
      fullWidth
      mt="md"
      radius="xl"
      size="md"
      onClick={onComplete}
      style={{ backgroundColor: tokens.primary, color: tokens.onPrimary }}
    >
      Complete lesson
    </Button>
  );
}
